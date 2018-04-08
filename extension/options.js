// Saves options to chrome.storage
function save_options() {
  var user = document.getElementById('gpm_user').value;
  var auto_play_checkbox = document.getElementById('auto_play').checked;
  chrome.storage.local.set({
    gpm_user: user,
    auto_play: auto_play_checkbox,
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get({
    gpm_user: "",
    auto_play: false
  }, function(items) {
    document.getElementById('gpm_user').value = items.gpm_user;
    document.getElementById('auto_play').checked = items.auto_play;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);