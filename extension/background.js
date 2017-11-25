function isMusicUrl(url) {
  // console.log(url);
  return url.includes("://play.google.com/music/");
}

function getMusicUrl(url) {
  return "https://play.google.com/music";
  return "https://play.google.com/music/listen#/wmp";
}

function try_to_play(id, callback) {
  chrome.tabs.executeScript(id, {file:"third-party/jquery-1.12.0.min.js"}, function() {
    chrome.tabs.executeScript(id, {file:"play_music.js"}, callback);
  });
}
var waiting_for_port_to_open = false;
var persistent_port;
var port_queue = [];
function requestPlay() {
  var message = {"play":"true"};
  try {
    persistent_port.postMessage(message);
  } catch (err) {
    // If we never connected or it disconnected
    console.log(err);
    persistent_post = undefined;
    port_queue.push(message);
  }
}

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "audio");
  // port.onMessage.addListener(function(msg) {
  //   console.log("Got message " + msg);
  // });
  persistent_port = port;
  waiting_for_port_to_open = false;
  for (var i = 0; i < port_queue.length; i++) {
    persistent_port.postMessage(port_queue[i]);
    port_queue = [];
  }
});

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.query({active:true, currentWindow: true}, function(tabs) {
    var original_tab_id = tabs[0].id;

    if (persistent_port !== undefined || waiting_for_port_to_open) {
      // Don't try to open a new tab
      requestPlay();
      return;
    } else {
      waiting_for_port_to_open = true;
    }
    // Try to open a new tab somewhere
    var use_new_window = true;
    if (use_new_window) {
      chrome.windows.getCurrent(function(original_window) { 
        chrome.windows.create({url: getMusicUrl(), 
                               focused : false, 
                               left    : original_window.left, 
                               top     : original_window.top/*, 
                               width   : original_window.width, 
                               height  : original_window.height*/}, 
                              function(window) {
          var music_tab_id = window.tabs[0].id;
          chrome.windows.update(original_window.id, { focused: true}, function() {
            // try_to_play(music_tab_id, function() {
            //   setTimeout(function(){chrome.tabs.move(music_tab_id, {windowId: original_window.id, index:0});}, 10000);
            // });
          });
          requestPlay();
          // try_to_play(music_tab_id, function() {
          //   // chrome.windows.update(original_window.id, { focused: true}, function() {
          //   //   setTimeout(function(){chrome.tabs.move(music_tab_id, {windowId: original_window.id, index:0})}, 15000);
          //   // });
          //   // setTimeout(function(){chrome.tabs.update(original_tab_id, {active: true});}, 5000);
          // });
        });
      });
    } else {
      chrome.tabs.create({url: getMusicUrl(), pinned:true, active:true}, function(tab) {
        requestPlay();
      });
    }
  });
});
