var mainExtensionId = "iplcnndnkaahamcojidocbfdagapbcal";
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.runtime.sendMessage(mainExtensionId, {rewind: true}, function(response){
  	if (response === undefined) {
  	  console.log(chrome.runtime.lastError);
  	  alert("You need enable \"One-Click Controls for Google Music\" to use the rewind button.");
  	  chrome.tabs.create({url:"https://chrome.google.com/webstore/detail/one-click-controls-for-go/iplcnndnkaahamcojidocbfdagapbcal",
  	                      active: true});
  	}
  });
});
