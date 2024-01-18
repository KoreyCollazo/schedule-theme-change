const { ipcRenderer } = require("electron");

ipcRenderer.on("updateThemes", (event, themes, schedule) => {
  renderThemes(themes);
  renderScheduledChanges(schedule);
});

// ipcRenderer.on("updateSchedule", (event, schedule) => {
//     renderScheduledChanges(schedule);
// });

function renderThemes(themes) {
  const themesContainer = document.getElementById('themesContainer');
  themesContainer.innerHTML = ''; // Clear previous content

  // Sort themes by updated_at in descending order
  const sortedThemes = themes.allThemes.sort((a, b) => {
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  sortedThemes.forEach((theme) => {
    const themeContainer = document.createElement('div');
    themeContainer.classList.add('theme-container');

    const themeDiv = document.createElement('div');
    themeDiv.classList.add('theme');

    if (theme.id === themes.activeTheme.id) {
      themeDiv.classList.add('active');
    }

    const themeName = document.createElement('span');
    themeName.innerText = theme.name;
    themeDiv.appendChild(themeName);

    if (theme.id !== themes.activeTheme.id) {
      const scheduleButton = document.createElement('button');
      scheduleButton.innerText = 'Schedule';
      scheduleButton.classList.add('schedule-button');
      scheduleButton.dataset.id = theme.id; // Use dataset to set data attributes
      themeDiv.appendChild(scheduleButton);
    }

    themeContainer.appendChild(themeDiv);
    themesContainer.appendChild(themeContainer);
  });
}

function renderScheduledChanges(schedule) {
    const scheduledChangesContainer = document.getElementById('scheduledChanges');
    scheduledChangesContainer.innerHTML = ''; // Clear previous content
  
    schedule.forEach((change, index) => {
      const changeElement = document.createElement('div');
      changeElement.classList.add('scheduled-change');
  
      const themeName = document.createElement('span');
      themeName.innerText = `Theme: ${change.themeName}`;
      changeElement.appendChild(themeName);
  
      const scheduleDateTime = document.createElement('span');
      scheduleDateTime.innerText = `Scheduled for ${change.scheduleDate} at ${change.scheduleTime}`;
      changeElement.appendChild(scheduleDateTime);
  
      const deleteButton = document.createElement('button');
      deleteButton.innerText = 'Delete';
      deleteButton.classList.add('delete-button');
      deleteButton.dataset.index = index; // Store the index in dataset for reference
      deleteButton.onclick = deleteScheduledChange;
      changeElement.appendChild(deleteButton);
  
      scheduledChangesContainer.appendChild(changeElement);
    });
  }
  
function deleteScheduledChange(event) {
    const index = event.target.dataset.index;

    // Send a message to the main process to delete the scheduled change
    ipcRenderer.send('deleteScheduledChange', index);

    // Placeholder for confirming deletion (you can add your logic here)
    alert('Scheduled change deleted!');
}

function openScheduleModal(themeId, themeName) {
  const modal = document.getElementById('scheduleModal');
  const modalContent = document.getElementById('formContainer');
  const themeNameElement = document.getElementById('themeName');
    
  themeNameElement.innerText = `Schedule Change for Theme: ${themeName}`;
  
  // Clear previous modal content
  modalContent.innerHTML = '';

  // Create form elements dynamically
  const formContainer = document.createElement('div');
  formContainer.classList.add('formContainer');

  const form = document.createElement('form');
  form.id = 'scheduleForm';
  form.dataset.themeId = themeId;
  form.dataset.themeName = themeName;

  const dateLabel = document.createElement('label');
  dateLabel.for = 'scheduleDate';
  dateLabel.innerText = 'Date:';
  form.appendChild(dateLabel);

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'scheduleDate';
  dateInput.name = 'scheduleDate';
  dateInput.required = true;
  form.appendChild(dateInput);

  const timeLabel = document.createElement('label');
  timeLabel.for = 'scheduleTime';
  timeLabel.innerText = 'Time:';
  form.appendChild(timeLabel);

  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.id = 'scheduleTime';
  timeInput.name = 'scheduleTime';
  timeInput.required = true;
  form.appendChild(timeInput);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.innerText = 'Confirm';
  confirmButton.onclick = confirmSchedule;
  form.appendChild(confirmButton);

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.innerText = 'Cancel';
  cancelButton.onclick = closeModal;
  form.appendChild(cancelButton);

  formContainer.appendChild(form);
  modalContent.appendChild(formContainer);

  // Display the modal
  modal.style.display = 'block';
}

function closeModal() {
  document.getElementById('scheduleModal').style.display = 'none';
}

window.closeModal = function() {
    document.getElementById('scheduleModal').style.display = 'none';
  };

function confirmSchedule() {
    const scheduleDateInput = document.getElementById('scheduleDate');
    const scheduleTimeInput = document.getElementById('scheduleTime');
  
    // Check if the date field is empty
    if (!scheduleDateInput.value) {
      alert('Please choose a date.');
      return; // Exit the function if the date field is empty
    }
  
    // Check if the time field is empty
    if (!scheduleTimeInput.value) {
      alert('Please choose a time.');
      return; // Exit the function if the time field is empty
    }
  
    // Get the current date
    const currentDate = new Date();
  
    // Get the selected schedule date from the input
    const selectedDate = new Date(scheduleDateInput.value);
  
    // Check if the selected date is in the future
    // if (selectedDate <= currentDate) {
    //   // Show an alert if the selected date is not in the future
    //   alert('Please choose a future date.');
    //   return; // Exit the function if the date is not valid
    // }
  
    // Retrieve the theme ID and theme name from the form's data attribute
    const themeId = document.getElementById('scheduleForm').dataset.themeId;
    const themeName = document.getElementById('scheduleForm').dataset.themeName;
  
    // Send the data to the main process
    ipcRenderer.send('scheduleFormSubmit', {
      themeId,
      themeName,
      scheduleDate: scheduleDateInput.value,
      scheduleTime: scheduleTimeInput.value,
    });
  
    // Placeholder for confirming schedule (you can add your logic here)
    alert('Schedule confirmed!');
    closeModal();
  }
  
  

document.addEventListener('click', (event) => {
  if (event.target.classList.contains('schedule-button')) {
    const themeId = event.target.dataset.id;
    const themeName = event.target.previousElementSibling.innerText;
    openScheduleModal(themeId, themeName);
  }
});
