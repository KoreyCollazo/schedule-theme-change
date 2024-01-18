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

// const updateInventorySchedule = '47 9 * * *';

cron.schedule('* * * * *', async () => {
    // Get the current date and time
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString().split('T')[0];
    const currentTimeString = currentDate.toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);

    // Iterate through the schedule array and check for scheduled events
    schedule.forEach(async (scheduledTheme, index) => {
        const { scheduleDate, scheduleTime, themeId } = scheduledTheme;

        // Check if the current date and time match any scheduled date and time
        if (currentDateString === scheduleDate && currentTimeString === scheduleTime) {
            console.log('Schedule change event:', scheduledTheme);

            try {
                // Fetch the list of themes
                const themes = await shopifyStore1.theme.list();

                // Find the theme to activate
                const themeToActivate = themes.find(theme => theme.id === +themeId);

                if (themeToActivate) {
                    // Update the theme to make it the main theme
                    await shopifyStore1.theme.update(themeToActivate.id, { role: 'main' });
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




const listThemes = async () => {
  try {
    // Fetch the list of themes
    const themes = await shopifyStore1.theme.list();

    // Find the currently active theme
    const activeTheme = themes.find((theme) => theme.role === 'main');

    return { allThemes: themes, activeTheme };
  } catch (error) {
    console.error('Error listing themes:', error);
  }
};

app.get('/list-themes', async (req, res) => {
  try {
    // Call the listThemes function
    const themesData = await listThemes();

    res.json({ message: 'Themes listed successfully', themes: themesData });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add this new route for handling theme scheduling
app.post('/schedule-theme', (req, res) => {
  try {
    const { themeId, themeName, scheduleDate, scheduleTime } = req.body;

    // Add the scheduled theme to the global schedule array
    schedule.push({ themeId, themeName, scheduleDate, scheduleTime });

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
