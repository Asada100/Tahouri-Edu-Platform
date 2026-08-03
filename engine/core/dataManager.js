// =====================================
// Tahouri Edu Platform
// Version 3.0
// Data Manager
// =====================================

const DataManager = {

    cache:{},



    loadJSON:async function(path){

        if(this.cache[path]){

            return this.cache[path];

        }

        const response = await fetch(path);

        const data = await response.json();

        this.cache[path] = data;

        return data;

    },



    getActivityFolder:function(activity){

        return activity.path;

    },



    getQuestions:async function(activity){

        return await this.loadJSON(

            this.getActivityFolder(activity) +

            "/questions.json"

        );

    },



    getCards:async function(activity){

        return await this.loadJSON(

            this.getActivityFolder(activity) +

            "/cards.json"

        );

    },



    clearCache:function(){

        this.cache = {};

    }

};

console.log(
    "Data Manager Ready"
);