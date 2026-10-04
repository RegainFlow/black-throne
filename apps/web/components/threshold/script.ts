export const SESSION_KEY = "bt:entered";

/**
 * Inline, render-blocking <head> script: decides before first paint whether the threshold
 * shows (first visit this session, motion allowed, not a lean page: the /links bio page or /merch).
 */
export const thresholdScript = `(function(){try{var d=document.documentElement,p=location.pathname;if(p==="/links"||p==="/merch"||p.indexOf("/merch/")===0)return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(sessionStorage.getItem("${SESSION_KEY}"))return;d.setAttribute("data-threshold","")}catch(e){}})();`;
