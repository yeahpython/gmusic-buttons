console.log = function() {}

function isMusicUrl(url) {
  return url.includes("://play.google.com/music/");
}

function getMusicUrl(callback) {
  chrome.storage.local.get({"gpm_user": ""}, function(items) {
    user = items["gpm_user"];
    if (user === "") {
      var site = "https://play.google.com/music/listen"
    } else {
      var site = "https://play.google.com/music/?authuser=" + user;
    }
    callback(site);
  });
}

var waiting_for_port_to_open = false;
// Never remove from these lists.
var persistent_ports = [];
var persistent_ports_status = [];
var persistent_ports_last_change = [];
var port_queue = [];

// This would have been a really easy thing to write if not for the
// fact that users sometimes have multiple Google Music tabs open.
function requestPlay(special_button=false) {
  if (waiting_for_port_to_open) {
    return;
  }
  if (special_button === "fast_forward") {
    var message = {"play": ((badge_state === "playing") ? "fast_forward" : true)};
  } else if (special_button === "rewind") {
    var message = {"play" : "rewind"};
  } else if (badge_state === "has no song") {
    var message = {"play" : "launch"};
  } else {
    // State is paused -> play button is visible
    var message = {"play": (badge_state !== "playing")};
  }

  console.log("Command: " + JSON.stringify(message));
  var found_port = false;

  // TODO: Clean up the cases

  var decorated_change_timestamps = [];
  for (var i = 0; i < persistent_ports_last_change.length; i++) {
    decorated_change_timestamps.push({
      index   : i, 
      playing : (persistent_ports_status[i].play_state), 
      visible : persistent_ports_status[i].has_focus, 
      time    : persistent_ports_last_change[i]
    });
    
  }
  if (message.play === "fast_forward" || message.play === "rewind") {
    // If one is playing, choose it first. Otherwise do it on the visible one, followed by time.
    var compfn = function(a,b) {
      // Sort by playing and not playing
      var playing_diff = (b.playing == "playing") - (a.playing == "playing");
      if (playing_diff) {
        return playing_diff;
      }

      var paused_diff = (b.playing == "paused") - (a.playing == "paused");
      if (paused_diff) {
        return paused_diff;
      }

      // Break ties with visibility
      var first_diff = b.visible - a.visible;
      if (first_diff) {
        return first_diff;
      }

      // Finally go from most recent to least recent
      return a.time - b.time;
    }
  } else if (message.play === true || message.launch === true) {
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
      console.log("status was: " + JSON.stringify(persistent_ports_status[index]));
      if (persistent_ports_status[index] === undefined || persistent_ports_status[index].play_state === "has no song") {
        if (message.play === true) {
          console.log("play -> launch");
          message.play = "launch";
        }
      }

      persistent_ports[index].postMessage(message);
      console.log("Dispatched to port " + index);
      found_port = true;
      // Everyone gets the pause and fast forward messages but only one should play
      if (message.play === true || message.play === "launch" || message.play === "rewind" || message.play === "fast_forward") {
        break;
      }
    } catch (err) {
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
    chrome.storage.local.get({"auto_play":false}, function(items){
      console.log(items.auto_play);
      if (items.auto_play === true) {
        message.play = "launch";
        port_queue.push(message);
        console.log("pushed " + JSON.stringify(message));
      }
    });
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
  }
  chrome.browserAction.setIcon({path:icon_dict});
}

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "audio");
  
  var port_id = persistent_ports.length;
  port.onMessage.addListener(function(msg) {
    if (msg.ready === "true") {
      console.log("heard READY");
      waiting_for_port_to_open = false;
      for (var i = 0; i < port_queue.length; i++) {
        console.log("Posting:" + JSON.stringify(port_queue[i]));
        port.postMessage(port_queue[i]);
      }
      port_queue = [];
      return;
    }
    console.assert(msg.status !== undefined);
    if (persistent_ports_status[port_id] !== msg.status) {
      persistent_ports_status[port_id] = msg.status;
      var d = new Date();
      persistent_ports_last_change[port_id] = d.getTime();
      setBadgeFromStatus(persistent_ports_status);
    }
  });
  port.onDisconnect.addListener(function(){
    persistent_ports_status[port_id] = {play_status :"disconnected", "has_focus":false};
    var d = new Date();
    persistent_ports_last_change[port_id] = d.getTime();
    setBadgeFromStatus(persistent_ports_status);
  });
  persistent_ports.push(port);
  persistent_ports_status.push(undefined);
  persistent_ports_last_change.push(-1);
  console.assert(persistent_ports.length == persistent_ports_status.length && persistent_ports.length == persistent_ports_last_change.length);
});

var USE_NEW_WINDOW = false;
function handleClick(special_button = false) {
  var found_port = requestPlay(special_button);
  // Attempt to send a play request.
  if (found_port || waiting_for_port_to_open) {
    return;
  }
  waiting_for_port_to_open = true;
  // Try to open a music tab
  getMusicUrl(function(music_url) {
    if (USE_NEW_WINDOW) {
      chrome.windows.getCurrent(function(original_window) {   
        chrome.windows.create(
          {
            url     : music_url, 
            focused : false, 
            left    : original_window.left, 
            top     : original_window.top
          }, 
          function(window) {
            chrome.windows.update(original_window.id, { focused: true}, function() {
          });
        });     
      });
    } else {
      chrome.tabs.create({url: music_url, pinned:true, active:true}, function(tab) {
      });
    }
  });
}


chrome.browserAction.onClicked.addListener(function(tab) {
  handleClick();
});

// Treat any outside message as fast forward
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    if (request.fastForward) {
      handleClick("fast_forward");
      sendResponse({status:"OK"});
    } else if (request.rewind) {
      handleClick("rewind");
      sendResponse({status:"OK"});
    }
  });
