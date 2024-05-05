/*! For license information please see component---src-pages-index-tsx-9012c06300bf95124360.js.LICENSE.txt */
(self.webpackChunkdevbears_github_io=self.webpackChunkdevbears_github_io||[]).push([[245],{6416:function(e,t,n){"use strict";var r=n(3270);const o={Em:function(e){const{children:t}=e;return r.createElement("em",Object.assign({},e,{className:"code-code"}),"gom",t)},Text:function(e){let{children:t}=e;return r.createElement("div",{style:{backgroundColor:"red"}},t)}};t.A=o},8115:function(e,t,n){"use strict";n.d(t,{Tx:function(){return i},vN:function(){return E}});var r=n(2467);const o=()=>(0,r.useStaticQuery)("764694655").site.siteMetadata;var c=n(3270);function i(e){let{title:t,description:n,pathname:r,children:i}=e;const{title:a,description:l,author:s,siteUrl:u}=o(),m={title:t||a,description:n||l,url:""+u+(r||"")};return c.createElement(c.Fragment,null,c.createElement("title",null,m.title),c.createElement("meta",{charSet:"utf-8"}),c.createElement("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),c.createElement("meta",{name:"description",content:m.description}),c.createElement("meta",{property:"og:type",content:"website"}),c.createElement("meta",{property:"og:title",content:m.title}),c.createElement("meta",{property:"og:description",content:m.description}),c.createElement("meta",{property:"og:url",content:m.url}),c.createElement("meta",{property:"og:site_name",content:"Weezip"}),c.createElement("meta",{property:"og:locale",content:"ko_KR"}),c.createElement("meta",{property:"twitter:title",content:m.title}),c.createElement("meta",{property:"twitter:description",content:m.description}),c.createElement("meta",{property:"twitter:url",content:m.url}),i)}n(6416);var a=n(6192),l=n(2189);const s=l.default.div.withConfig({displayName:"style__TocDiv",componentId:"sc-1my6kjf-0"})([""]),u=l.default.div.withConfig({displayName:"style__TocIconDiv",componentId:"sc-1my6kjf-1"})(["& > button.open-button{border:0;padding:10px;border-radius:6px;cursor:pointer;","}& > .toc-box{position:relative;padding:10px;background-color:white;border-radius:10px;transition:all 0.2s;"," & > button.close-button{position:absolute;padding:10px;border:0;top:0;right:0;cursor:pointer;}}"],a.Pr,a.MS),m=l.default.ul.withConfig({displayName:"style__TocElementUl",componentId:"sc-1my6kjf-2"})(["list-style:none;margin:0;padding-left:10px;font-weight:normal;& > li{& > a{text-decoration:none;color:black;&.selected{color:brown !important;}}}"]);var d=n(7248),p=n.n(d),f=n(2059),g=n(1044);function E(e){const{toc:t,anchorHolder:n}=e,{pathname:r}=(0,f.useLocation)(),o=(0,c.useRef)(null),i="selected",a=()=>{var e;if(null===o.current)return;if(!n||n.length<=0)return;let t=null;const c=Array.from(n);for(let n of c)if(n.getBoundingClientRect().top>-30){t=n.getAttribute("href");break}if(t||(t=c[c.length-1].getAttribute("href")),null===(e=o.current)||void 0===e||e.querySelectorAll("a."+i).forEach((e=>{e.classList.remove(i)})),t){var a;const e=null===(a=o.current)||void 0===a?void 0:a.querySelector("a[href='"+decodeURIComponent(""+r+t)+"']");e&&e.classList.add(i)}};return(0,c.useEffect)((()=>(a(),(0,g.B)()&&document.addEventListener("scroll",a),()=>{(0,g.B)()&&document.removeEventListener("scroll",a)}))),c.createElement(s,{"data-component":"toc",ref:o},c.createElement(E.TocElement,Object.assign({},e,{toc:t})))}E.Icon=(0,c.forwardRef)(((e,t)=>{const{0:n,1:r}=(0,c.useState)(!1);(0,c.useImperativeHandle)(t,(()=>({close:o,open:i,toggle:a})));const o=()=>r(!1),i=()=>r(!0),a=()=>r((e=>!e));return c.createElement(u,{"data-component":"toc-icon"},n?c.createElement("div",{className:p()("toc-box")},c.createElement("button",{className:"close-button",onClick:o},c.createElement("i",{className:"fa-solid fa-xmark"})),c.createElement(E,e)):c.createElement("button",{className:"open-button",onClick:i},c.createElement("i",{className:"fa-solid fa-bars-staggered"})))})),E.TocElement=function(e){const t=(0,c.useId)(),{toc:n}=e;return c.createElement(m,{"data-component":"toc-element"},(null==n?void 0:n.items)&&n.items.map((n=>c.createElement("li",{key:t+"-"+n.title},c.createElement(r.Link,{to:n.url},n.title),n.items&&c.createElement(E.TocElement,Object.assign({},e,{toc:n}))))))}},2099:function(e,t,n){"use strict";n.r(t),n.d(t,{Head:function(){return c}});var r=n(3270),o=n(8115);function c(){return r.createElement(o.Tx,null)}t.default=e=>{let{data:{site:t}}=e;return r.createElement("main",null,r.createElement("h1",null,t.siteMetadata.title))}},1044:function(e,t,n){"use strict";n.d(t,{B:function(){return r}});const r=()=>"undefined"!=typeof window},7248:function(e,t){var n;!function(){"use strict";var r={}.hasOwnProperty;function o(){for(var e="",t=0;t<arguments.length;t++){var n=arguments[t];n&&(e=i(e,c(n)))}return e}function c(e){if("string"==typeof e||"number"==typeof e)return e;if("object"!=typeof e)return"";if(Array.isArray(e))return o.apply(null,e);if(e.toString!==Object.prototype.toString&&!e.toString.toString().includes("[native code]"))return e.toString();var t="";for(var n in e)r.call(e,n)&&e[n]&&(t=i(t,n));return t}function i(e,t){return t?e?e+" "+t:e+t:e}e.exports?(o.default=o,e.exports=o):void 0===(n=function(){return o}.apply(t,[]))||(e.exports=n)}()}}]);
//# sourceMappingURL=component---src-pages-index-tsx-9012c06300bf95124360.js.map