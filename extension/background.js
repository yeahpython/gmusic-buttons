// function withDependencies(cb, code) {
//   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//    chrome.tabs.executeScript(tabs[0].id, {code: code}, function(result) {
//      if (!result[0]) {
//        console.log("LOADING EVERYTHING");
//        chrome.tabs.insertCSS(tabs[0].id, {file:"mystyles.css"}, function(){
//          chrome.tabs.insertCSS(tabs[0].id, {file:"third-party/jquery-ui-1.12.1.custom/jquery-ui.min.css"}, function(){
//            chrome.tabs.executeScript(tabs[0].id, {file:"third-party/jquery-1.12.0.min.js"}, function(){
//              chrome.tabs.executeScript(tabs[0].id, {file:"third-party/jquery-ui-1.12.1.custom/jquery-ui.min.js"}, function(){
//                addedDependencies = true;
//                cb(tabs[0].id);
//              });
//            });
//          });
//      });
//        } else {
//        cb(tabs[0].id);
//        }
//  });
//   });
// }

function isMusicUrl(url) {
  // console.log(url);
  return url.includes("://play.google.com/music/");
}

function getMusicUrl(url) {
  return "https://play.google.com/music/";
}

function try_to_play(id, callback) {
  chrome.tabs.executeScript(id, {file:"third-party/jquery-1.12.0.min.js"}, function() {
    chrome.tabs.executeScript(id, {file:"play_music.js"}, callback);
  });
}

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.query({active:true, currentWindow: true}, function(tabs) {
    var original_tab_id = tabs[0].id;
    chrome.tabs.query({}, function(tabs) {
      for (var i = 0, tab; tab = tabs[i]; i++) {
        if (tab.url && isMusicUrl(tab.url)) {
          // chrome.tabs.update(tab.id, {selected: true});
          try_to_play(tab.id);
       //    chrome.tabs.executeScript(tab.id, {file:"third-party/jquery-1.12.0.min.js"}, function() {
        //     chrome.tabs.executeScript(tab.id, {file:"play_music.js"}, function(){
        //      console.log("And we're back");
        //     });
        // });
          return;
        }
      }
      chrome.windows.getCurrent(function(original_window) { 
        chrome.windows.create({url: getMusicUrl(), focused: false, width:100, height:100}, function(window) {
          var music_tab_id = window.tabs[0].id;
          try_to_play(music_tab_id, function() {
            chrome.windows.update(original_window.id, { focused: true}, function() {
              setTimeout(function(){chrome.tabs.move(music_tab_id, {windowId: original_window.id, index:0})}, 15000);
            });
            // setTimeout(function(){chrome.tabs.update(original_tab_id, {active: true});}, 5000);
          });
        });
      });
      // chrome.tabs.create({url: getMusicUrl(), pinned:true}, function(tab) {
      //   try_to_play(tab.id, function() {
      //     setTimeout(function(){chrome.tabs.update(original_tab_id, {active: true});}, 5000);
      //   });
      // });
    });
  });
});