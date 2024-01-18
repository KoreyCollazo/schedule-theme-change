const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fetch = require('electron-fetch').default;
const axios = require('axios');
const io = require('socket.io-client');

let mainWindow;

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
  const socket = io('http://localhost:3000'); // Replace with your server URL
  mainWindow.loadFile('index.html');
  socket.on('updateSchedule', async (schedule) => {
    console.log('update the scheduling', schedule)
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

// Handle form submission from the modal
ipcMain.on('scheduleFormSubmit', async (event, formData) => {
    try {
      // Destructure formData
      const { themeId, themeName, scheduleDate, scheduleTime } = formData;
  
      // Make an HTTP POST request to your server endpoint
      const response = await axios.post('http://localhost:3000/schedule-theme', {
        themeId,
        themeName,
        scheduleDate,
        scheduleTime,
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
    try {
      // Send a request to the server to delete the scheduled change
      axios.post('http://localhost:3000/delete-scheduled-change', { index })
        .then(response => {
          console.log(response.data);
        })
        .catch(error => {
          console.error('Error deleting scheduled change on server:', error);
          event.sender.send('deleteScheduledChangeError', 'Error deleting scheduled change');
        });
    } catch (error) {
      console.error('Error:', error);
      event.sender.send('deleteScheduledChangeError', 'Error deleting scheduled change');
    }
  });
  

async function fetchThemes() {
  try {
    const response = await fetch('http://localhost:3000/list-themes');
    const data = await response.json();
    return data.themes;
  } catch (error) {
    console.error('Error fetching themes:', error);
    return [];
  }
}

async function fetchSchedule() {
    try {
      const response = await fetch('http://localhost:3000/get-schedule');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching themes:', error);
      return [];
    }
  }
