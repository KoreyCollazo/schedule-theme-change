const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fetch = require('electron-fetch').default;
const axios = require('axios');
const io = require('socket.io-client');

let mainWindow;
let currentStore = 'shopifyStore1'; // Set the default store

app.whenReady().then(createWindow);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  const socket = io('http://localhost:3000');
  mainWindow.loadFile('index.html');
  socket.on('updateSchedule', async (schedule) => {
    console.log('Update the scheduling', schedule);
    const themes = await fetchThemes();
    mainWindow.webContents.send('updateThemes', themes, schedule);
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Load themes when the window is ready
  mainWindow.webContents.on('did-finish-load', async () => {
    const themes = await fetchThemes();
    const schedule = await fetchSchedule();
    mainWindow.webContents.send('updateThemes', themes, schedule);
  });
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

ipcMain.on('toggleStore', async (event) => {
  // Toggle between shopifyStore1 and shopifyStore2
  currentStore = (currentStore === 'shopifyStore1') ? 'shopifyStore2' : 'shopifyStore1';
  event.reply('toggleStoreResponse', { message: `Switched to ${currentStore} store successfully` });
  const themes = await fetchThemes(currentStore);
    const schedule = await fetchSchedule();
    mainWindow.webContents.send('updateThemes', themes, schedule);
});

// Remove the fetchStore function

// Handle form submission from the modal
ipcMain.on('scheduleFormSubmit', async (event, formData) => {
  try {
    // Destructure formData
    const { themeId, themeName, scheduleDate, scheduleTime } = formData;

    // Make an HTTP POST request to your server endpoint with the current store
    const response = await axios.post(`http://localhost:3000/schedule-theme`, {
      themeId,
      themeName,
      scheduleDate,
      scheduleTime,
      currentStore,
    });

    // Check the response and send a corresponding message back to the renderer process
    if (response.status === 200) {
      event.reply('scheduleFormSubmitResponse', { message: 'Form submitted successfully' });
    } else {
      event.reply('scheduleFormSubmitResponse', { error: 'Server error' });
    }
  } catch (error) {
    console.error('Error:', error);
    event.reply('scheduleFormSubmitResponse', { error: 'Internal Server Error' });
  }
});

ipcMain.on('deleteScheduledChange', (event, index) => {
  // Send a request to the server to delete the scheduled change with the current store
  axios.post('http://localhost:3000/delete-scheduled-change', { index, store: currentStore })
    .then(response => {
      console.log(response.data);
    })
    .catch(error => {
      console.error('Error deleting scheduled change on server:', error);
      event.sender.send('deleteScheduledChangeError', 'Error deleting scheduled change');
    });
});

async function fetchThemes() {
  try {
    // Make an HTTP GET request to fetch themes with the current store
    const response = await axios.get(`http://localhost:3000/list-themes?store=${currentStore}`);
    const data = response.data;
    return data.themes;
  } catch (error) {
    console.error('Error fetching themes:', error);
    return [];
  }
}

async function fetchSchedule() {
  try {
    // Make an HTTP GET request to fetch the schedule with the current store
    const response = await axios.get('http://localhost:3000/get-schedule');
    const data = response.data;
    return data;
  } catch (error) {
    console.error('Error fetching themes:', error);
    return [];
  }
}
