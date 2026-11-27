// =====================================
// Tahouri Edu Platform
// Version 2.0
// Event Manager
// =====================================

const EventManager = {

    events:{},

    on:function(eventName,callback){

        if(!this.events[eventName]){

            this.events[eventName]=[];

        }

        this.events[eventName].push(callback);

    },

    emit:function(eventName,data){

        if(eventName === "activityFinished"){
            console.trace("EventManager: activityFinished EMITTED", data);
        }

        if(!this.events[eventName]){

            return;

        }

        this.events[eventName].forEach(function(callback){

            callback(data);

        });

    },

    off:function(eventName,callback){

        if(!this.events[eventName]) return;

        if(typeof callback !== "function"){
            delete this.events[eventName];
            return;
        }

        this.events[eventName]=this.events[eventName].filter(function(listener){
            return listener !== callback;
        });

        if(!this.events[eventName].length) delete this.events[eventName];

    },

    clear:function(){

        this.events={};

    }

};

if (typeof window !== "undefined") {
    window.EventManager = EventManager;
}

console.log("Event Manager Ready");