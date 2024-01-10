const express = require('express');
const app = express();
const Shopify = require('shopify-api-node');
const cron = require('node-cron');
const dotenv = require('dotenv');

dotenv.config(); // Load environmental variables from .env file


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



// Start your express app
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
