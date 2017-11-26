var LOAD_CHECKING_SELECTOR = "[data-id='shuffle-my-library']"
var INITIAL_SELECTOR = "#iflFab";
var DEFAULT_SELECTOR = "[data-id='shuffle-my-library']"

var visible = true;

$(window).focus(function() {
  visible = true;
  console.log("set visible to true");
  sendStatusIfChanged(true);
});

$(window).blur(function() {
  visible = false;
  console.log("set visible to false");
  sendStatusIfChanged(true);
});

function try_to_play() {
	if ($("#player-bar-play-pause").css("pointer-events") === "none") {
	  // Wait a bit so that the play button for the most recent song has time to load
	  if ($(INITIAL_SELECTOR).first().length) {
	  	setTimeout(function(){
	  		$(INITIAL_SELECTOR).click();
	  	  setTimeout(sendStatusIfChanged, 100)
      }, 1000);
	  } else {
	  	// Shuffle seems to be available everywhere so just use that as the backup.
	  	setTimeout(function(){
        $(DEFAULT_SELECTOR).click();
	  	  setTimeout(sendStatusIfChanged, 100);
      }, 1000);
	  }
	} else {
	  $("#player-bar-play-pause").click();
	  setTimeout(sendStatusIfChanged, 100)
	}
	// $("#haha-custom-loading-div").remove();
}

function try_to_pause() {
  var is_playing = $("#player-bar-play-pause[title^='Pause']").length > 0;
	if (is_playing) {
    $("#player-bar-play-pause").click();
	  setTimeout(sendStatusIfChanged, 100)
  }
}

function wait_for_load(callback) {
	if ($(LOAD_CHECKING_SELECTOR).get().length === 0) {
		setTimeout(function(){wait_for_load(callback)}, 100);
		console.log("Waiting for load...");
		return;
	} else {
		callback();
	}
}

var port = chrome.runtime.connect({name: "audio"});
port.onMessage.addListener(function(msg) {
  console.log(msg);
  if (msg.play === true) {
  	wait_for_load(try_to_play);
  } else {
  	wait_for_load(try_to_pause);
  }
});

var status = "";
var last_visible = undefined;
function sendStatusIfChanged(force_message = false) {
  var has_no_song = $("#currently-playing-title").length == 0;
  // if (!has_no_song && status != "has no song") {
  //   console.log("Currently playing:", $("#currently-playing-title").text())
  // }
	var is_playing = $("#player-bar-play-pause[title^='Pause']").length > 0;
	var new_status = "";
	if (has_no_song) {
		new_status = "has no song"
	} else {
		new_status = is_playing ? "playing" : "paused"
	}
	if ((new_status != status) || (last_visible != visible) || force_message) {
		status = new_status;
    last_visible = visible;
		port.postMessage({"status": {"play_state" : status, "has_focus":!!last_visible}});
	}
}


function repeatedlySendStatus() {
	sendStatusIfChanged();
	setTimeout(repeatedlySendStatus, 1000);
}

repeatedlySendStatus();




