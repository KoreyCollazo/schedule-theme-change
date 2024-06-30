const express = require('express');
const app = express();
const http = require('http').Server(app);  // Create an http server
const io = require('socket.io')(http);    // Attach Socket.IO to the http server
const Shopify = require('shopify-api-node');
const cron = require('node-cron');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

dotenv.config();

// Define a globally accessible array for storing scheduled themes
const schedule = [];

const shopifyConfigStore1 = {
  shopName: process.env.SHOP_NAME_STORE1,
  apiKey: process.env.API_KEY_STORE1,
  password: process.env.PASSWORD_STORE1,
};

const shopifyConfigStore2 = {
  shopName: process.env.SHOP_NAME_STORE2,
  apiKey: process.env.API_KEY_STORE2,
  password: process.env.PASSWORD_STORE2,
};

const shopifyStore1 = new Shopify(shopifyConfigStore1);
const shopifyStore2 = new Shopify(shopifyConfigStore2);


cron.schedule('* * * * *', async () => {
    // Get the current date and time
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split('T')[0];
    const currentTimeString = currentDate.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);

    // Iterate through the schedule array and check for scheduled events
    schedule.forEach(async (scheduledTheme, index) => {
        const { scheduleDate, scheduleTime, themeId, store } = scheduledTheme;

        // Check if the current date and time match any scheduled date and time
        if (currentDateString === scheduleDate && currentTimeString === scheduleTime) {
            console.log('Schedule change event:', scheduledTheme);

            try {
                // Fetch the list of themes
                const themes = await store.theme.list();

                // Find the theme to activate
                const themeToActivate = themes.find(theme => theme.id === +themeId);

                if (themeToActivate) {
                    // Update the theme to make it the main theme
                    await store.theme.update(themeToActivate.id, { role: 'main' });
                    console.log('Theme updated successfully:', themeToActivate);
                } else {
                    console.error('Error: Theme not found in the list');
                }
                // Remove the scheduled theme from the schedule array
                const deletedChange = schedule.splice(index, 1)[0];

                // Emit the 'updateSchedule' event to inform connected clients
                io.emit('updateSchedule', schedule);

                // Placeholder for additional logic (you can log or process the deleted change)
                console.log('Scheduled change deleted:', deletedChange);
            } catch (error) {
                console.error('Error updating theme:', error);
            }
        }
    });
});




const listThemes = async (shopifyStore) => {
    try {
      // Fetch the list of themes using the provided Shopify store
      const themes = await shopifyStore.theme.list();
  
      // Find the currently active theme
      const activeTheme = themes.find((theme) => theme.role === 'main');
  
      return { allThemes: themes, activeTheme };
    } catch (error) {
      console.error('Error listing themes:', error);
    }
  };
  

  app.get('/list-themes', async (req, res) => {
    try {
      // Determine the Shopify store based on the query parameter or use shopifyStore1 as default
      const selectedStore = req.query.store === 'shopifyStore2' ? shopifyStore2 : shopifyStore1;
  
      // Call the listThemes function with the selected store
      const themesData = await listThemes(selectedStore);
  
      res.json({ message: 'Themes listed successfully', themes: themesData });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
  app.post('/schedule-theme', (req, res) => {
    try {
      const { themeId, themeName, scheduleDate, scheduleTime, currentStore } = req.body;
      const store = (currentStore === 'shopifyStore2') ? shopifyStore2 : shopifyStore1;
  
      // Add the scheduled theme to the global schedule array
      schedule.push({ themeId, themeName, scheduleDate, scheduleTime, store });
  
      // Log the scheduled theme data
      console.log(schedule);
  
      // Emit the 'updateSchedule' event to inform connected clients
      io.emit('updateSchedule', schedule);
  
      // For now, you can send a response back to the client
      res.json({ message: 'Scheduled theme change successful' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

  

// Route to delete a scheduled change
app.post('/delete-scheduled-change', (req, res) => {
    try {
      const { index } = req.body;
  
      // Remove the scheduled change from the schedule array
      const deletedChange = schedule.splice(index, 1)[0];
  
      // Emit the 'updateSchedule' event to inform connected clients
      io.emit('updateSchedule', schedule);
  
      // Placeholder for additional logic (you can log or process the deleted change)
      console.log('Scheduled change deleted:', deletedChange);
  
      res.json({ message: 'Scheduled change deleted successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});



const batchSize = 10; // Number of products to retrieve in each request

app.get('/active-products', async (req, res) => {
  try {
    let params = { limit: batchSize };
    let activeProducts = [];

    do {
      const products = await shopifyStore1.product.list(params);

      // Extract relevant data and filter active products
      const filteredProducts = products.map(product => {
        return {
          id: product.id,
          title: product.title,
          status: product.status,
          product_type: product.product_type,
          variant: {
            price: product.variants[0]?.price || 0,
            sku: product.variants[0]?.sku || '',
          },
          images: product.images.map(image => image.src),
          metafields: [],
        };
      }).filter(product => product.status === 'active');
      
      // Fetch and add metafields for each product
      const metafieldsPromises = filteredProducts.map(async product => {
        const metafields = await shopifyStore1.metafield.list({
          metafield: { owner_resource: 'product', owner_id: product.id }
        });

        // Filter and include specific metafields
        const filteredMetafields = metafields.filter(metafield => {
          const allowedKeys = [
            'case_quantity',
            'description_tag',
            'burn_time',
            'scent_notes_base',
            'scent_notes_mid',
            'scent_notes_top',
          ];
          return allowedKeys.includes(metafield.key);
        });

        product.metafields = filteredMetafields;
      });

      await Promise.all(metafieldsPromises);

      // Add the filtered active products to the result array
      activeProducts = activeProducts.concat(filteredProducts);

      // Get the parameters for the next page
      params = products.nextPageParameters;
    } while (params !== undefined);

    // Send the final filtered active products data as JSON in the response
    res.json(activeProducts);
  } catch (error) {
    console.error('Error fetching active products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Route to get the schedule array
app.get('/get-schedule', (req, res) => {
  try {
    // Return the schedule array
    res.json(schedule);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start your express app
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
