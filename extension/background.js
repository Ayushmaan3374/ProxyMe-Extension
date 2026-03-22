chrome.runtime.onInstalled.addListener(()=>{

    chrome.storage.sync.get(
        ["proxyEnabled"],
        (data)=>{

            if(data.proxyEnabled === undefined){
                chrome.storage.sync.set({
                    proxyEnabled:true
                });
            }

        }
    );

});