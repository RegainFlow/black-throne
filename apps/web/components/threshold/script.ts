export const SESSION_KEY = "bt:entered";

/**
 * Inline, render-blocking <head> script: decides before first paint whether the threshold
 * shows (first visit this session, motion allowed, not the /links bio page).
 */
export const thresholdScript = `(function(){try{var d=document.documentElement;if(location.pathname==="/links")return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(sessionStorage.getItem("${SESSION_KEY}"))return;d.setAttribute("data-threshold","")}catch(e){}})();`;
