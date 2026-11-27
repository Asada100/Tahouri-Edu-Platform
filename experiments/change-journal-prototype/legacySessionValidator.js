"use strict";
// Mirrors ActivitySessionManager v1.9 / schema v1 validation rules.
// Kept isolated so migration fixtures can be checked without runtime wiring.
function validateLegacySession(session, activeProfileId) {
  if(!session||typeof session!=="object"||Array.isArray(session))return false;
  if(session.version!=="1.9")return false;
  if(session.schemaVersion!==undefined&&session.schemaVersion!==1)return false;
  if(typeof session.profileId!=="string"||!session.profileId||session.profileId!==activeProfileId)return false;
  if(typeof session.id!=="string"||!session.id)return false;
  if(typeof session.activityId!=="string"||!session.activityId)return false;
  if(!["active","resumable"].includes(session.status))return false;
  if(!session.engineState||typeof session.engineState!=="object"||Array.isArray(session.engineState))return false;
  const type=session.activityType,data=session.engineState;
  if(type==="DictationEngine"||type==="dictation")
    return data.kind==="dictation"&&!!data.state&&typeof data.state==="object"&&
      !!data.content&&Array.isArray(data.content.questions)&&data.content.questions.length>0;
  if(type==="WordPuzzleEngine"||type==="wordPuzzle")
    return data.kind==="wordPuzzle"&&!!data.state&&typeof data.state==="object"&&!Array.isArray(data.state)&&
      !!data.round&&typeof data.round==="object"&&!Array.isArray(data.round);
  if(type==="QuizEngine"||type==="quiz")
    return data.kind==="quiz"&&!!data.state&&typeof data.state==="object"&&
      Array.isArray(data.questions)&&data.questions.length>0&&Number.isInteger(data.currentQuestion)&&
      data.currentQuestion>=0&&data.currentQuestion<data.questions.length;
  if(type==="MemoryEngine"||type==="memory")
    return data.kind==="memory"&&Array.isArray(data.cards)&&data.cards.length>0&&
      Number.isInteger(data.totalPairs)&&data.totalPairs>0&&Number.isInteger(data.matchedPairs)&&
      data.matchedPairs>=0&&data.matchedPairs<=data.totalPairs;
  if(type==="PuzzleEngine"||type==="puzzle")
    return data.kind==="puzzle"&&!!data.state&&typeof data.state==="object"&&
      Array.isArray(data.items)&&!!data.puzzle&&typeof data.puzzle==="object";
  if(type==="ClassificationEngine"||type==="classification")
    return Array.isArray(data.items)&&data.items.length>0&&Array.isArray(data.categories)&&data.categories.length>0;
  return false;
}
if(typeof module!=="undefined"&&module.exports)module.exports={validateLegacySession};
if(typeof window!=="undefined")window.TahouriExperimentalLegacySessionValidator=Object.freeze({validateLegacySession});
