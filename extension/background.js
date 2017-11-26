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
// Never remove from these lists.
var persistent_ports = [];
var persistent_ports_status = [];
var persistent_ports_last_change = [];
var port_queue = [];
function requestPlay() {
  // State is paused -> play button is visible
  var message = {"play": (badge_state !== "playing")};
  console.log(message);
  var found_port = false;

  var decorated_change_timestamps = [];
  for (var i = 0; i < persistent_ports_last_change.length; i++) {
    decorated_change_timestamps.push({index:i, visible:persistent_ports_status[i].has_focus, time:persistent_ports_last_change[i]});
    
  }
  if (message.play) {
    // If one is visible, choose it first, otherwise use time.
    var compfn = function(a,b) {
      var first_diff = b.visible - a.visible;
      if (first_diff) {
        return first_diff;
      }
      // b goes first if it is bigger
      return b.time - a.time;
    }
  } else {
    // I swapped the arguments. Basically we are placing the most "prominent"
    // things on the stack.
    var compfn = function(b,a) {
      var first_diff = b.visible - a.visible;
      if (first_diff) {
        return first_diff;
      }
      return b.time - a.time;
    }
  }
  decorated_change_timestamps.sort(compfn);
  // Iterate through ports by most recently modified
  for (var j = 0; j < decorated_change_timestamps.length; j++) {
    try {
      var index = decorated_change_timestamps[j].index;

      persistent_ports[index].postMessage(message);
      found_port = true;
      console.log("Sent command to port " + index + ".");
      // Everyone gets the pause messages but only one should play
      if (message.play) {
        break;
      }
    } catch (err) {
      // console.log([err]);
      if (err.message.startsWith("Cannot read property 'postMessage' of undefined")) {

      } else if (err.message.startsWith("Attempting to use a disconnected port object")) {

      } else {
        console.log("Encountered error while requesting play.");
        console.log(err);
      }
      persistent_ports[index] = undefined;
      
    }
  }
  if (!found_port) {
    console.log("Did not find port.")
    port_queue.push(message);
  }
  return found_port;
}

var badge_state = "has no song";
function setBadgeFromStatus(statuses) {
  var is_playing = false;
  var has_song = false;
  for (var i = 0; i < statuses.length; i++) {
    if (statuses[i] === undefined) {
      continue;
    }
    if (statuses[i].play_state == "playing") {
      is_playing = true;
    }
    if (statuses[i].play_state == "paused" || statuses[i].play_state == "playing") {
      has_song = true;
    }
  }
  if (!has_song) {
    badge_state = "has no song";
    var icon_dict = {'19':chrome.extension.getURL("images/no_song_19.png"),
                     '38':chrome.extension.getURL("images/no_song_38.png")
                    };
  } else {
    if (is_playing) {
      badge_state = "playing";
      var icon_dict = {'19':chrome.extension.getURL("images/pause_19.png"),
                       '38':chrome.extension.getURL("images/pause_38.png")
                      };
    } else {
      badge_state = "paused";
      var icon_dict = {'19':chrome.extension.getURL("images/play_19.png"),
                       '38':chrome.extension.getURL("images/play_38.png")
                      };
    }
    // var icon_dict = chrome.extension.getURL(is_playing : "images/pause.png", "images/play.png");
  }
  chrome.browserAction.setIcon({path:icon_dict});
}

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "audio");
  // port.onMessage.addListener(function(msg) {
  //   console.log("Got message " + msg);
  // });
  waiting_for_port_to_open = false;
  for (var i = 0; i < port_queue.length; i++) {
    port.postMessage(port_queue[i]);
    port_queue = [];
  }
  var port_id = persistent_ports.length;
  port.onMessage.addListener(function(msg) {

    console.assert(msg.status !== undefined);
    if (persistent_ports_status[port_id] !== msg.status) {
      // console.log(persistent_ports_status)
      persistent_ports_status[port_id] = undefined;
      persistent_ports_status[port_id] = msg.status;// {"play_state":msg.status.play_state, "has_focus":!!msg.status.has_focus};
      // console.log(msg.status)
      // console.log(persistent_ports_status)
      var d = new Date();
      persistent_ports_last_change[port_id] = d.getTime();
      console.log(JSON.stringify(persistent_ports_status));
      setBadgeFromStatus(persistent_ports_status);
    }

    

  });
  port.onDisconnect.addListener(function(){
    persistent_ports_status[port_id] = {play_status :"disconnected", "has_focus":false};
    var d = new Date();
    persistent_ports_last_change[port_id] = d.getTime();
    console.log(persistent_ports_status);
    setBadgeFromStatus(persistent_ports_status);
  });
  persistent_ports.push(port);
  persistent_ports_status.push(undefined);
  persistent_ports_last_change.push(-1);
  console.assert(persistent_ports.length == persistent_ports_status.length && persistent_ports.length == persistent_ports_last_change.length);
});

var USE_NEW_WINDOW = false;
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.query({active:true, currentWindow: true}, function(tabs) {
    var original_tab_id = tabs[0].id;

    // if (persistent_port !== undefined || waiting_for_port_to_open) {
    
    var found_port = requestPlay();
    // Attempt to send a play request.
    if (found_port || waiting_for_port_to_open) {
      return;
    }
    waiting_for_port_to_open = true;
    // Try to open a music tab
    
    if (USE_NEW_WINDOW) {
      chrome.windows.getCurrent(function(original_window) { 
        chrome.windows.create(
          {
            url     : getMusicUrl(), 
            focused : false, 
            left    : original_window.left, 
            top     : original_window.top/*, 
            width   : original_window.width, 
            height  : original_window.height*/
          }, 
          function(window) {
            // var music_tab_id = window.tabs[0].id;
            chrome.windows.update(original_window.id, { focused: true}, function() {
          });
        });
      });
    } else {
      chrome.tabs.create({url: getMusicUrl(), pinned:true, active:true}, function(tab) {
      });
    }
  });
});
