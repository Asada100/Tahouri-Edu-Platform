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

        if(!this.events[eventName]){

            return;

        }

        this.events[eventName].forEach(function(callback){

            callback(data);

        });

    },

    off:function(eventName){

        delete this.events[eventName];

    },

    clear:function(){

        this.events={};

    }

};

console.log("Event Manager Ready");