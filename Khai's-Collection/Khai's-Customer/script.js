import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9J_lDc9U5aY5m-Ic3ACnhJNV_iKQ7s_E",
  authDomain: "khai-s-collection.firebaseapp.com",
  projectId: "khai-s-collection",
  storageBucket: "khai-s-collection.firebasestorage.app",
  messagingSenderId: "711311570038",
  appId: "1:711311570038:web:94e0241fcdcede490cdb57",
  measurementId: "G-W3YMB80TV8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

let products=[];
let customerOrders=[];
let ordersUnsubscribe=null;

// EDIT THESE DETAILS with Khai's real contact accounts and customer feedbacks.
const STORE_CONTACTS = [
  { icon:"☎", label:"Call / Text", value:"0927 654 9395", href:"tel:09276549395" },
  { icon:"f", label:"Facebook", value:"fritzyyy123", href:"https://www.facebook.com/fritzyyy123" },
  { icon:"💬", label:"Messenger", value:"Message us on Facebook", href:"https://www.facebook.com/fritzyyy123" }
];

const FEEDBACKS = [
  { name:"Happy Customer", text:"Love the quality and the fit! Will definitely order again." },
  { name:"Happy Customer", text:"Very accommodating and smooth transaction. Thank you!" },
  { name:"Happy Customer", text:"The item looks even better in person. Super nice!" }
];

let cart=JSON.parse(localStorage.getItem("khaiCart"))||[],currentProduct=null,currentQuantity=1,selectedSize="",currentCategory="All",currentUser=null,currentProfile=null;
const productsContainer=document.getElementById("products"),productTotal=document.getElementById("productTotal"),emptyProducts=document.getElementById("emptyProducts"),cartCount=document.getElementById("cartCount"),cartItems=document.getElementById("cartItems"),subtotal=document.getElementById("subtotal"),cartPanel=document.querySelector(".cart"),cartOverlay=document.getElementById("cartOverlay"),productModal=document.getElementById("productModal"),checkoutOverlay=document.getElementById("checkoutOverlay"),successOverlay=document.getElementById("successOverlay");
const accountOverlay=document.getElementById("accountOverlay"),accountLoggedOut=document.getElementById("accountLoggedOut"),accountLoggedIn=document.getElementById("accountLoggedIn"),profileForm=document.getElementById("profileForm"),loginForm=document.getElementById("loginForm"),signupForm=document.getElementById("signupForm"),accountLabel=document.getElementById("accountLabel"),profilePhotoInput=document.getElementById("profilePhotoInput"),profileUploadPreview=document.getElementById("profileUploadPreview");
const customerOrdersContainer=document.getElementById("customerOrders"),ordersLoginHint=document.getElementById("ordersLoginHint");
const customerName=document.getElementById("customerName"),customerPhone=document.getElementById("customerPhone"),customerMunicipality=document.getElementById("customerMunicipality"),customerBarangay=document.getElementById("customerBarangay"),customerLandmark=document.getElementById("customerLandmark"),paymentMethod=document.getElementById("paymentMethod"),deliveryFeeEl=document.getElementById("deliveryFee"),deliveryFeeNote=document.getElementById("deliveryFeeNote"),checkoutTotalEl=document.getElementById("checkoutTotal");

const DELIVERY_ZONES={
  "Jagna":{
    "Alejawan":0,"Balili":0,"Boctol":0,"Buyog":0,"Bunga Ilaya":0,"Bunga Mar":0,"Cabunga-an":0,"Calabacita":0,"Cambugason":0,"Can-ipol":0,"Canjulao":0,"Cantagay":0,"Cantuyoc":0,"Can-uba":0,"Can-upao":0,"Faraon":0,"Ipil":0,"Kinagbaan":0,"Laca":0,"Larapan":0,"Lonoy":0,"Looc":0,"Malbog":0,"Mayana":0,"Naatang":0,"Nausok":0,"Odiong":0,"Pagina":0,"Pangdan":0,"Poblacion":0,"Tejero":0,"Tubod Mar":0,"Tubod Monte":0
  },
  "Duero":{
    "Alejawan":20,"Mambool":20,"Madua Sur":20,"San Isidro":20,
    "Madua Norte":30,"Duay":30,"Payao":30,"San Pedro":30,"Itum":30,"Danao":30,
    "Angilan":40,"Anibongan":40,"Cansuhay":40,"Langkis":40,"Lobogon":40,"Mawi":40,"Taytay":40,
    "Bangwalog":50,"Guinsularan":50,"San Antonio":50
  },
  "Garcia Hernandez":{
    "Candulao":20,"Catmon":20,"Poblacion East":20,"Poblacion West":20,"Sacaon":20,
    "Cagwang":30,"Calma":30,"Canayaon East":30,"Canayaon West":30,"Lungsodaan East":30,"Lungsodaan West":30,"Libertad":30,"Sampong":30,"Tabuan":30,
    "Abijilan":40,"Antipolo":40,"Basiao":40,"Cambuyo":40,"Candanas":40,"Datag":40,"Malinao":40,"Pasong":40,"Togbongon":40,"Ulbujan East":40,"Ulbujan West":40,"Victoria":40,
    "Cayam":50,"Cupa":50,"Estaca":50,"Manaba":50
  }
};
let activeOrderStatus="All";
const formatPrice=p=>"₱"+Number(p).toLocaleString("en-PH");
const showError=message=>alert(message);

function renderStoreContact(){
  const el=document.getElementById("contactLinks");
  if(!el)return;
  el.innerHTML=STORE_CONTACTS.map(c=>`<a class="contact-link" href="${c.href}" target="_blank" rel="noopener"><span class="contact-icon">${c.icon}</span><span><small>${c.label}</small><strong>${c.value}</strong></span><b>→</b></a>`).join("");
}

function renderFeedbacks(){
  const el=document.getElementById("feedbacks");
  if(!el)return;
  el.innerHTML=FEEDBACKS.map(f=>`<article class="feedback-card"><div class="stars">★★★★★</div><p>“${f.text}”</p><strong>${f.name}</strong><small>Verified customer</small></article>`).join("");
}

function statusStep(status){
  const map={Pending:1,Confirmed:1,Preparing:1,Shipped:2,Completed:3};
  return map[status]||1;
}

function statusLabel(status){
  if(status==="Cancelled")return "Cancelled";
  if(status==="Completed")return "Delivered";
  if(status==="Shipped")return "Delivery on the way";
  return "Preparing";
}

function renderCustomerOrders(){
  if(!customerOrdersContainer||!ordersLoginHint)return;
  if(!currentUser){
    customerOrdersContainer.innerHTML="";
    ordersLoginHint.classList.remove("hidden");
    return;
  }
  ordersLoginHint.classList.add("hidden");
  const filtered=customerOrders.filter(o=>activeOrderStatus==="All"||o.status===activeOrderStatus);
  if(!filtered.length){
    customerOrdersContainer.innerHTML=`<div class="orders-empty"><div>♡</div><h3>${customerOrders.length?"No orders in this status":"No orders yet"}</h3><p>${customerOrders.length?"Try another order status.":"Your placed orders will appear here."}</p>${customerOrders.length?"":`<a href="#shop" class="outline-btn dark-outline">Start Shopping →</a>`}</div>`;
    return;
  }
  customerOrdersContainer.innerHTML=filtered.map(o=>{
    const step=statusStep(o.status);
    const total=formatPrice(o.total||0);
    const date=o.date?new Date(o.date).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}):"";
    const items=(o.items||[]).map(i=>`<div class="order-product"><img src="${i.image||""}" alt="${i.name||"Product"}"><div><strong>${i.name||"Product"}</strong><small>Size ${i.size||"—"} · Qty ${i.quantity||0}</small></div><b>${formatPrice(Number(i.price||0)*Number(i.quantity||0))}</b></div>`).join("");
    const cancelled=o.status==="Cancelled";
    const deliveryFee=Number(o.deliveryFee||0);
    return `<article class="customer-order ${cancelled?"order-cancelled":""}"><div class="order-top"><div><span class="order-id">${o.id}</span><small>${date}</small></div><strong>${total}</strong></div><div class="order-products">${items}</div><div class="order-delivery-summary"><span>Delivery: ${o.customer?.barangay||"—"}, ${o.customer?.municipality||"—"}</span><b>${deliveryFee?formatPrice(deliveryFee):"FREE"}</b></div>${cancelled?`<div class="customer-cancelled"><strong>Order Cancelled</strong><span>${o.cancellationReason||"This order was cancelled by the store."}</span></div>`:`<div class="order-tracker"><div class="tracker-line"><span class="tracker-progress step-${step}"></span></div><div class="tracker-step ${step>=1?"active":""}"><span>1</span><small>Preparing</small></div><div class="tracker-step ${step>=2?"active":""}"><span>2</span><small>Delivery on the way</small></div><div class="tracker-step ${step>=3?"active":""}"><span>3</span><small>Delivered</small></div></div>`}<div class="order-status-text ${cancelled?"cancelled-status":""}">Status: <strong>${statusLabel(o.status)}</strong></div></article>`;
  }).join("");
}

function updateOrderTabs(){
  document.querySelectorAll(".order-status-tab").forEach(btn=>btn.classList.toggle("active",btn.dataset.status===activeOrderStatus));
}

function openOrdersPage(){
  document.getElementById("ordersPageOverlay")?.classList.add("show");
  renderCustomerOrders();
}
function closeOrdersPage(){document.getElementById("ordersPageOverlay")?.classList.remove("show");}

document.getElementById("ordersNavBtn")?.addEventListener("click",openOrdersPage);
document.getElementById("closeOrdersPage")?.addEventListener("click",closeOrdersPage);
document.querySelectorAll(".order-status-tab").forEach(btn=>btn.addEventListener("click",()=>{activeOrderStatus=btn.dataset.status;updateOrderTabs();renderCustomerOrders();}));

function subscribeCustomerOrders(){
  if(ordersUnsubscribe){ordersUnsubscribe();ordersUnsubscribe=null;}
  if(!currentUser){customerOrders=[];renderCustomerOrders();return;}
  const q=query(collection(db,"orders"),where("customer.uid","==",currentUser.uid));
  ordersUnsubscribe=onSnapshot(q,snapshot=>{
    customerOrders=snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    renderCustomerOrders();
  },error=>{
    console.error("Customer orders listener error:",error);
    customerOrders=[];
    customerOrdersContainer.innerHTML=`<div class="orders-empty"><h3>Orders unavailable</h3><p>Please try again after refreshing the page.</p></div>`;
  });
}


/* ===== PRODUCT IMAGE LIGHTBOX ===== */
(function setupProductImageLightbox(){
  const style=document.createElement("style");
  style.textContent=`
    .image-lightbox{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.92);-webkit-tap-highlight-color:transparent}
    .image-lightbox.show{display:flex}
    .image-lightbox img{display:block;max-width:96vw;max-height:92vh;width:auto;height:auto;object-fit:contain;border-radius:10px;box-shadow:0 20px 70px rgba(0,0,0,.5);user-select:none;-webkit-user-drag:none}
    .image-lightbox-close{position:absolute;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));width:46px;height:46px;border:0;border-radius:50%;background:rgba(255,255,255,.95);color:#111;font-size:28px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation}
    #modalImage{cursor:zoom-in}
    @media(max-width:600px){.image-lightbox{padding:10px}.image-lightbox img{max-width:98vw;max-height:88vh;border-radius:6px}.image-lightbox-close{width:44px;height:44px;font-size:26px}}
  `;
  document.head.appendChild(style);
  const box=document.createElement("div");
  box.className="image-lightbox";
  box.setAttribute("role","dialog");
  box.setAttribute("aria-label","Product image");
  box.innerHTML='<button type="button" class="image-lightbox-close" aria-label="Close image">×</button><img alt="Product image">';
  document.body.appendChild(box);
  const img=box.querySelector("img");
  const close=()=>{box.classList.remove("show");document.body.style.overflow="";};
  const open=(src,alt)=>{if(!src)return;img.src=src;img.alt=alt||"Product image";box.classList.add("show");document.body.style.overflow="hidden";};
  box.querySelector(".image-lightbox-close").addEventListener("click",close);
  box.addEventListener("click",e=>{if(e.target===box)close();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
  document.addEventListener("click",e=>{
    if(e.target?.id==="modalImage"){e.preventDefault();e.stopPropagation();open(e.target.src,e.target.alt);}
  },true);
})();

function productCardMarkup(product){
  return `<article class="product-card" data-id="${product.id}">
    <div class="product-image">
      <img src="${product.image||""}" alt="${product.name||"Product"}" loading="lazy">
      <button type="button" class="quick-add" data-id="${product.id}">QUICK VIEW</button>
    </div>
    <div class="product-info">
      <span class="product-category">${product.category||"Collection"}</span>
      <h3 class="product-name">${product.name||"Product"}</h3>
      <div class="product-price">${formatPrice(product.price)}</div>
    </div>
  </article>`;
}

function bindProductCards(container){
  if(!container)return;
  container.querySelectorAll(".product-card").forEach(card=>{
    card.addEventListener("click",event=>{
      if(event.target.closest(".quick-add"))return;
      openProduct(card.dataset.id);
    });
  });
  container.querySelectorAll(".quick-add").forEach(button=>{
    button.addEventListener("click",event=>{
      event.stopPropagation();
      openProduct(button.dataset.id);
    });
  });
}

function displayProducts(list=products){
  productsContainer.innerHTML="";
  if(!list.length){emptyProducts.style.display="block";productTotal.textContent="0 items";return}
  emptyProducts.style.display="none";
  productTotal.textContent=`${list.length} ${list.length===1?"item":"items"}`;
  productsContainer.innerHTML=list.map(productCardMarkup).join("");
  bindProductCards(productsContainer);
}

const ALBUMS=[
  {key:"Tops",title:"Tops",subtitle:"Easy pieces for every day."},
  {key:"Dresses",title:"Dresses",subtitle:"Feminine pieces for every moment."},
  {key:"Bottoms",title:"Bottoms",subtitle:"Build your look from the bottom up."},
  {key:"Sets",title:"Sets",subtitle:"Complete looks, made simple."}
];

function renderAlbums(){
  const container=document.getElementById("collectionAlbums");
  if(!container)return;
  const available=ALBUMS.filter(album=>products.some(p=>p.category===album.key));
  if(!available.length){
    container.innerHTML='<div class="albums-empty"><h3>Collection coming soon</h3><p>New pieces will appear here.</p></div>';
    return;
  }
  container.innerHTML=available.map(album=>{
    const items=products.filter(p=>p.category===album.key).slice(0,4);
    return `<section class="album" id="album-${album.key.toLowerCase().replace(/[^a-z0-9]+/g,"-")}">
      <div class="album-head">
        <div><p class="eyebrow">${album.key==="New"?"JUST IN":"COLLECTION"}</p><h3>${album.title}</h3><p>${album.subtitle}</p></div>
        <button class="album-view-all" type="button" data-category="${album.key}">View All <span>→</span></button>
      </div>
      <div class="album-products">${items.map(productCardMarkup).join("")}</div>
    </section>`;
  }).join("");
  container.querySelectorAll(".album").forEach(album=>bindProductCards(album));
  container.querySelectorAll(".album-view-all").forEach(button=>button.addEventListener("click",()=>showAllProducts(button.dataset.category)));
}

function showAllProducts(category="All"){
  const section=document.getElementById("allProducts");
  if(!section)return;
  section.classList.remove("hidden-catalog");
  const title=section.querySelector("h2");
  const eyebrow=section.querySelector(".eyebrow");
  const list=category==="All"?products:products.filter(p=>p.category===category);
  if(title)title.textContent=category==="All"?"Shop All":category;
  if(eyebrow)eyebrow.textContent=category==="All"?"ALL ITEMS":"COLLECTION";
  displayProducts(list);
  section.scrollIntoView({behavior:"smooth",block:"start"});
}

function filterProducts(){displayProducts(products)}
const searchInput=document.getElementById("searchInput");
if(searchInput){searchInput.addEventListener("input",filterProducts);}
document.getElementById("menuBtn").addEventListener("click",()=>document.querySelector(".nav-links").classList.toggle("open"));document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>document.querySelector(".nav-links").classList.remove("open")));
document.getElementById("viewAllBtn")?.addEventListener("click",()=>showAllProducts("All"));
document.querySelectorAll(".nav-links a[href=\"#shop\"]").forEach(a=>a.addEventListener("click",()=>setTimeout(()=>showAllProducts("All"),50)));

function getProductSizes(product){
  const sizes=Array.isArray(product?.sizes)?product.sizes.filter(Boolean):[];
  return sizes.length?sizes:["S","M","L","XL"];
}
function getSizeStockMap(product){
  const map={};
  if(product?.sizeStock&&typeof product.sizeStock==="object"){Object.entries(product.sizeStock).forEach(([size,value])=>map[size]=Math.max(0,Number(value||0)));}
  return map;
}
function getStock(product,size=selectedSize){
  const map=getSizeStockMap(product);
  if(Object.keys(map).length&&size) return Math.max(0,Number(map[size]||0));
  return Math.max(0,Number(product?.stock||0));
}
function updateQuantityUI(){
  const stock=getStock(currentProduct,selectedSize);
  currentQuantity=Math.min(Math.max(1,currentQuantity),Math.max(1,stock));
  document.getElementById("quantity").textContent=stock?currentQuantity:"0";
  document.getElementById("stockStatus").textContent=stock?`${stock} available`:"Sold out";
  document.getElementById("plusBtn").disabled=!stock||currentQuantity>=stock;
  document.getElementById("minusBtn").disabled=!stock||currentQuantity<=1;
  document.getElementById("addModalBtn").disabled=!stock||!selectedSize;
}
function openProduct(id){
  currentProduct=products.find(p=>p.id===id);if(!currentProduct)return;
  currentQuantity=1;
  const sizes=getProductSizes(currentProduct);selectedSize=sizes[0]||"";
  document.getElementById("modalImage").src=currentProduct.image;document.getElementById("modalImage").alt=currentProduct.name;
  document.getElementById("modalCategory").textContent=currentProduct.category;document.getElementById("modalName").textContent=currentProduct.name;
  document.getElementById("modalPrice").textContent=formatPrice(currentProduct.price);document.getElementById("modalDescription").textContent=currentProduct.description||"";
  const sizeStock=getSizeStockMap(currentProduct);
  document.getElementById("productSizes").innerHTML=sizes.map(size=>{const available=Object.keys(sizeStock).length?Number(sizeStock[size]||0):getStock(currentProduct,size);return `<button type="button" data-size="${String(size).replace(/"/g,"&quot;")}" ${available<=0?"disabled":""}>${size}${available<=0?" · Sold out":""}</button>`}).join("");
  document.querySelectorAll("#productSizes button").forEach(b=>b.addEventListener("click",()=>{if(b.disabled)return;document.querySelectorAll("#productSizes button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedSize=b.dataset.size;currentQuantity=1;updateQuantityUI();}));
  const firstAvailable=[...document.querySelectorAll("#productSizes button")].find(b=>!b.disabled);
  if(firstAvailable){firstAvailable.classList.add("selected");selectedSize=firstAvailable.dataset.size;}
  updateQuantityUI();productModal.classList.add("show");
}
document.getElementById("modalClose").addEventListener("click",()=>productModal.classList.remove("show"));productModal.addEventListener("click",e=>{if(e.target===productModal)productModal.classList.remove("show")});
document.querySelectorAll(".sizes button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".sizes button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedSize=b.textContent}));
document.getElementById("plusBtn").addEventListener("click",()=>{const stock=getStock(currentProduct);if(currentQuantity<stock){currentQuantity++;updateQuantityUI();}});
document.getElementById("minusBtn").addEventListener("click",()=>{if(currentQuantity>1){currentQuantity--;updateQuantityUI();}});
document.getElementById("addModalBtn").addEventListener("click",()=>{
  if(!currentProduct||!selectedSize)return;const stock=getStock(currentProduct,selectedSize);if(!stock){alert(`Size ${selectedSize} is sold out.`);return;}
  const existing=cart.find(i=>i.id===currentProduct.id&&i.size===selectedSize);const existingQty=existing?.quantity||0;
  if(existingQty+currentQuantity>stock){alert(`Only ${stock} item${stock===1?"":"s"} available in size ${selectedSize}.`);return;}
  if(existing)existing.quantity+=currentQuantity;else cart.push({id:currentProduct.id,name:currentProduct.name,price:currentProduct.price,cost:currentProduct.cost||0,image:currentProduct.image,size:selectedSize,quantity:currentQuantity});
  saveCart();updateCart();productModal.classList.remove("show");openCart();
});
function saveCart(){localStorage.setItem("khaiCart",JSON.stringify(cart))}
function updateCart(){const qty=cart.reduce((t,i)=>t+i.quantity,0);cartCount.textContent=qty;if(!cart.length){cartItems.innerHTML='<div class="cart-empty"><div>🛍️</div><h3>Your bag is empty</h3><p>Add something you love.</p></div>';subtotal.textContent="₱0";return}cartItems.innerHTML="";let total=0;cart.forEach((item,index)=>{total+=item.price*item.quantity;const el=document.createElement("div");el.className="cart-item";el.innerHTML=`<img src="${item.image}" alt="${item.name}"><div class="cart-item-info"><h4>${item.name}</h4><p>Size: ${item.size}</p><p>${formatPrice(item.price)} × ${item.quantity}</p></div><button class="remove-item" data-index="${index}">✕</button>`;cartItems.appendChild(el)});subtotal.textContent=formatPrice(total);document.querySelectorAll(".remove-item").forEach(b=>b.addEventListener("click",()=>{cart.splice(Number(b.dataset.index),1);saveCart();updateCart()}))}
function openCart(){cartPanel.classList.add("open");cartOverlay.classList.add("show")}function closeCart(){cartPanel.classList.remove("open");cartOverlay.classList.remove("show")}
document.getElementById("cartBtn").addEventListener("click",openCart);document.getElementById("closeCart").addEventListener("click",closeCart);cartOverlay.addEventListener("click",closeCart);

function updateDeliveryFee(){
  const municipality=customerMunicipality?.value||"";
  const barangay=customerBarangay?.value||"";
  const fee=Number(DELIVERY_ZONES[municipality]?.[barangay]??0);
  if(deliveryFeeEl)deliveryFeeEl.textContent=fee?formatPrice(fee):"FREE";
  if(deliveryFeeNote)deliveryFeeNote.textContent=barangay?(fee?`Delivery to ${barangay}, ${municipality}`:`Free delivery within Jagna`):"Select your barangay to calculate.";
  return fee;
}
function updateCheckoutTotal(){
  const subtotalAmount=cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.quantity||0),0);
  const fee=updateDeliveryFee();
  if(checkoutTotalEl)checkoutTotalEl.textContent=formatPrice(subtotalAmount+fee);
}
customerMunicipality?.addEventListener("change",()=>{
  const list=DELIVERY_ZONES[customerMunicipality.value]||{};
  const entries=Object.entries(list).sort((a,b)=>a[0].localeCompare(b[0]));
  customerBarangay.innerHTML='<option value="">Select barangay</option>'+entries.map(([name])=>`<option value="${name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}">${name}</option>`).join("");
  customerBarangay.disabled=!entries.length;
  updateCheckoutTotal();
});
customerBarangay?.addEventListener("change",updateCheckoutTotal);

document.getElementById("checkoutBtn").addEventListener("click",()=>{
  if(!cart.length){alert("Your cart is empty.");return}
  if(!currentUser){closeCart();openAccount("login");alert("Please login or create an account before checkout.");return}
  if(!hasCompleteProfile()){closeCart();openProfileForm();alert("Please complete your name, address, and contact number first.");return}
  customerName.value=currentProfile.name||currentUser.displayName||"";
  customerPhone.value=currentProfile.phone||"";
  customerMunicipality.value="";
  customerBarangay.innerHTML='<option value="">Select municipality first</option>';
  customerBarangay.disabled=true;
  customerLandmark.value="";
  updateDeliveryFee();
  updateCheckoutTotal();
  closeCart();
  checkoutOverlay.classList.add("show");
});
document.getElementById("closeCheckout").addEventListener("click",()=>checkoutOverlay.classList.remove("show"));

document.getElementById("checkoutForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!currentUser){showError("Please login first.");return;}
  if(!cart.length){showError("Your cart is empty.");return;}

  const orderId="KH"+Date.now().toString().slice(-6)+Math.random().toString(36).slice(2,6).toUpperCase();
  const municipality=customerMunicipality.value;
  const barangay=customerBarangay.value;
  const landmark=customerLandmark.value.trim();
  const deliveryFee=Number(DELIVERY_ZONES[municipality]?.[barangay]??0);
  if(!municipality||!barangay||!landmark){showError("Please complete your municipality, barangay, and landmark.");return;}
  const orderItems=cart.map(i=>({id:i.id,name:i.name,price:Number(i.price||0),cost:Number(i.cost||0),image:i.image,size:i.size,quantity:Number(i.quantity||0)}));
  const subtotalAmount=cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const total=subtotalAmount+deliveryFee;
  const orderRef=doc(db,"orders",orderId);

  try{
    await runTransaction(db,async transaction=>{
      const uniqueIds=[...new Set(orderItems.map(i=>i.id))];
      const productRefs=uniqueIds.map(id=>doc(db,"products",id));
      const snapshots=[];
      for(const ref of productRefs)snapshots.push(await transaction.get(ref));

      const stockMap={};
      snapshots.forEach((snap,index)=>{
        const id=uniqueIds[index];
        if(!snap.exists())throw new Error(`PRODUCT_NOT_FOUND:${id}`);
        const data=snap.data();
        const sizeStock=getSizeStockMap(data);
        const hasSizeStock=Object.keys(sizeStock).length>0;
        // For per-size inventory, calculate the master stock from the size counts.
        // This keeps legacy/mismatched product.stock values from causing a false permission error.
        const stock=hasSizeStock
          ? Object.values(sizeStock).reduce((sum,value)=>sum+Math.max(0,Number(value||0)),0)
          : Math.max(0,Number(data.stock||0));
        if(data.visible===false||stock<=0)throw new Error(`SOLD_OUT:${id}`);
        stockMap[id]={ref:productRefs[index],data,stock,sizeStock,hasSizeStock};
      });

      for(const item of orderItems){
        const record=stockMap[item.id];
        if(!record)throw new Error(`PRODUCT_NOT_FOUND:${item.id}`);
        const requested=Number(item.quantity||0);
        const available=record.hasSizeStock?Math.max(0,Number(record.sizeStock[item.size]||0)):record.stock;
        if(requested<1||requested>available)throw new Error(`INSUFFICIENT_STOCK:${item.id}:${item.size}:${available}`);
        if(record.hasSizeStock)record.sizeStock[item.size]=available-requested;
        record.stock-=requested;
      }

      const order={
        id:orderId,
        customer:{uid:currentUser.uid,name:customerName.value.trim(),phone:customerPhone.value.trim(),municipality,barangay,landmark,address:`${barangay}, ${municipality} — ${landmark}`,payment:paymentMethod.value,photoURL:currentProfile?.photoURL||currentUser.photoURL||""},
        items:orderItems,
        subtotal:subtotalAmount,
        deliveryFee,
        total,
        createdAt:serverTimestamp(),
        date:new Date().toISOString(),
        status:"Pending"
      };
      transaction.set(orderRef,order);
      Object.values(stockMap).forEach(record=>transaction.update(record.ref,{stock:record.stock,...(record.hasSizeStock?{sizeStock:record.sizeStock}:{}),visible:record.stock>0,updatedAt:serverTimestamp()}));
    });

    cart=[];saveCart();updateCart();checkoutOverlay.classList.remove("show");successOverlay.classList.add("show");e.target.reset();
  }catch(error){
    console.error("Checkout transaction failed:",error);
    const message=String(error.message||"");
    if(message.startsWith("SOLD_OUT:"))showError("Sorry, one of the items in your cart just sold out.");
    else if(message.startsWith("INSUFFICIENT_STOCK:")){const parts=message.split(":");showError(parts[2]?`Sorry, size ${parts[2]} only has ${parts[3]||0} available.`:`Sorry, an item in your cart has insufficient stock.`);}
    else if(message.startsWith("PRODUCT_NOT_FOUND:"))showError("One of the items in your cart is no longer available.");
    else if(error.code==="permission-denied")showError("We couldn't place the order because Firestore permissions need to be checked.");
    else showError("We couldn't place your order. Please try again.");
  }
});

document.getElementById("successClose").addEventListener("click",()=>{successOverlay.classList.remove("show");location.hash="shop"});

function switchAccountTab(mode){const isSignup=mode==="signup";document.getElementById("loginTab").classList.toggle("active",!isSignup);document.getElementById("signupTab").classList.toggle("active",isSignup);loginForm.classList.toggle("hidden",isSignup);signupForm.classList.toggle("hidden",!isSignup);document.getElementById("accountTitle").textContent=isSignup?"Create your account":"Login to your account";document.getElementById("accountSubtitle").textContent=isSignup?"Create an account for faster and easier checkout.":"Save your details and make checkout faster."}
function openAccount(mode="login"){accountOverlay.classList.add("show");if(currentUser&&!profileForm.classList.contains("hidden")){showLoggedIn();return}if(currentUser&&hasCompleteProfile()){showLoggedIn();return}accountLoggedOut.classList.remove("hidden");accountLoggedIn.classList.add("hidden");profileForm.classList.add("hidden");switchAccountTab(mode)}
function closeAccount(){accountOverlay.classList.remove("show")}
document.getElementById("accountBtn").addEventListener("click",()=>openAccount());document.getElementById("closeAccount").addEventListener("click",closeAccount);accountOverlay.addEventListener("click",e=>{if(e.target===accountOverlay)closeAccount()});
document.getElementById("ordersLoginBtn")?.addEventListener("click",()=>{openAccount("login");});
document.getElementById("loginTab").addEventListener("click",()=>switchAccountTab("login"));document.getElementById("signupTab").addEventListener("click",()=>switchAccountTab("signup"));document.getElementById("goSignup").addEventListener("click",()=>switchAccountTab("signup"));document.getElementById("goLogin").addEventListener("click",()=>switchAccountTab("login"));

document.querySelectorAll(".show-password").forEach(btn=>btn.addEventListener("click",()=>{const input=document.getElementById(btn.dataset.target);const visible=input.type==="text";input.type=visible?"password":"text";btn.textContent=visible?"Show":"Hide"}));
async function applyPersistence(remember){await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence)}
async function saveCustomerProfile(user,details){const profile={uid:user.uid,name:details.name.trim(),phone:details.phone.trim(),address:details.address.trim(),email:user.email||"",photoURL:details.photoURL!==undefined?details.photoURL:(currentProfile?.photoURL||user.photoURL||""),updatedAt:serverTimestamp()};await setDoc(doc(db,"customers",user.uid),profile,{merge:true});currentProfile={...currentProfile,...profile};}
async function loadCustomerProfile(user){const snap=await getDoc(doc(db,"customers",user.uid));if(snap.exists()){currentProfile=snap.data();}else{currentProfile={name:user.displayName||"",phone:"",address:"",email:user.email||"",uid:user.uid}}return currentProfile}
function hasCompleteProfile(){return !!(currentProfile&&currentProfile.name&&currentProfile.phone&&currentProfile.address)}
function renderProfilePhoto(url){const safeUrl=String(url||"");profileUploadPreview.innerHTML=safeUrl?`<img src="${safeUrl}" alt="Profile photo">`:`<span class="brown-emoji">👤</span>`;document.getElementById("profileAvatar").innerHTML=safeUrl?`<img src="${safeUrl}" alt="Profile photo">`:`<span class="brown-emoji">👤</span>`;}
function fillProfileForm(){document.getElementById("profileNameInput").value=currentProfile?.name||currentUser?.displayName||"";document.getElementById("profilePhoneInput").value=currentProfile?.phone||"";document.getElementById("profileAddressInput").value=currentProfile?.address||"";profilePhotoInput.value="";renderProfilePhoto(currentProfile?.photoURL||currentUser?.photoURL||"")}
function openProfileForm(){accountLoggedOut.classList.add("hidden");accountLoggedIn.classList.add("hidden");profileForm.classList.remove("hidden");fillProfileForm();accountOverlay.classList.add("show")}
function showLoggedIn(){accountLoggedOut.classList.add("hidden");profileForm.classList.add("hidden");accountLoggedIn.classList.remove("hidden");document.getElementById("accountWelcome").textContent=`Welcome, ${currentProfile?.name||currentUser?.displayName||"Customer"}!`;document.getElementById("profileName").textContent=currentProfile?.name||currentUser?.displayName||"Customer";document.getElementById("profileEmail").textContent=currentUser?.email||"";document.getElementById("profilePhone").textContent=currentProfile?.phone||"—";document.getElementById("profileAddress").textContent=currentProfile?.address||"—";const photo=currentProfile?.photoURL||currentUser?.photoURL||"";renderProfilePhoto(photo);const headerAvatar=document.getElementById("headerAvatar");if(headerAvatar)headerAvatar.innerHTML=photo?`<img src="${photo}" alt="Profile photo">`:`<span class="brown-emoji">👤</span>`;accountLabel.textContent=(currentProfile?.name||currentUser?.displayName||"Account").split(" ")[0]}

document.getElementById("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const email=loginEmail.value.trim(),password=loginPassword.value,remember=rememberLogin.checked;
 try{await applyPersistence(remember);const credential=await signInWithEmailAndPassword(auth,email,password);
   try{await loadCustomerProfile(credential.user);}catch(profileError){console.error("Profile load failed:",profileError);currentProfile={uid:credential.user.uid,name:credential.user.displayName||"",phone:"",address:"",email:credential.user.email||""};}
   closeAccount();if(!hasCompleteProfile())openProfileForm();else showLoggedIn();
 }catch(error){console.error(error);showError(error.code==="auth/invalid-credential"||error.code==="auth/wrong-password"?"Incorrect email or password.":error.code==="auth/invalid-email"?"Please enter a valid email address.":error.message||"Login failed. Please try again.");}
});

document.getElementById("signupForm").addEventListener("submit",async e=>{e.preventDefault();if(signupPassword.value!==signupConfirmPassword.value){showError("Passwords do not match.");return}const remember=rememberSignup.checked;try{await applyPersistence(remember);const credential=await createUserWithEmailAndPassword(auth,signupEmail.value.trim(),signupPassword.value);await updateProfile(credential.user,{displayName:signupName.value.trim()});await saveCustomerProfile(credential.user,{name:signupName.value,phone:signupPhone.value,address:signupAddress.value});closeAccount();showLoggedIn()}catch(error){console.error(error);showError(error.code==="auth/email-already-in-use"?"That email already has an account. Please login instead.":error.message)}});

async function googleLogin(){
 try{await applyPersistence(true);const result=await signInWithPopup(auth,googleProvider);
   try{await loadCustomerProfile(result.user);}catch(profileError){console.error("Profile load failed:",profileError);currentProfile={uid:result.user.uid,name:result.user.displayName||"",phone:"",address:"",email:result.user.email||""};}
   closeAccount();if(!hasCompleteProfile())openProfileForm();else showLoggedIn();
 }catch(error){
   console.error("Google sign-in failed:",error);
   const messages={"auth/popup-closed-by-user":"Google sign-in was cancelled.","auth/popup-blocked":"Your browser blocked the Google sign-in window. Please allow pop-ups for this site.","auth/unauthorized-domain":"This website domain is not authorized in Firebase. Add the current domain in Firebase Authentication → Settings → Authorized domains.","auth/operation-not-allowed":"Google sign-in is not enabled in Firebase Authentication."};
   showError(messages[error.code]||error.message||"Google sign-in failed. Please try again.");
 }
}
document.getElementById("googleLoginBtn").addEventListener("click",googleLogin);document.getElementById("googleSignupBtn").addEventListener("click",googleLogin);

profilePhotoInput.addEventListener("change",e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){showError("Please choose an image file.");e.target.value="";return}if(file.size>5*1024*1024){showError("Profile photo is too large. Please choose an image under 5MB.");e.target.value="";return}const url=URL.createObjectURL(file);profileUploadPreview.innerHTML=`<img src="${url}" alt="Profile photo preview">`;});

async function uploadProfilePhoto(file){const formData=new FormData();formData.append("file",file);formData.append("upload_preset","Khai's_products");formData.append("folder","khai-profiles");const response=await fetch("https://api.cloudinary.com/v1_1/zeuidhev/image/upload",{method:"POST",body:formData});if(!response.ok){console.error("Profile photo upload failed:",await response.text());throw new Error("Profile photo upload failed.")}const uploaded=await response.json();if(!uploaded.secure_url)throw new Error("Cloudinary did not return a profile photo URL.");return uploaded.secure_url}

document.getElementById("profileForm").addEventListener("submit",async e=>{e.preventDefault();if(!currentUser)return;try{const file=profilePhotoInput.files?.[0];let photoURL=currentProfile?.photoURL||currentUser.photoURL||"";if(file)photoURL=await uploadProfilePhoto(file);await updateProfile(currentUser,{displayName:profileNameInput.value.trim(),photoURL});await saveCustomerProfile(currentUser,{name:profileNameInput.value,phone:profilePhoneInput.value,address:profileAddressInput.value,photoURL});showLoggedIn()}catch(error){console.error(error);showError("Couldn't save your details. Please try again.")}});
document.getElementById("editProfileBtn").addEventListener("click",openProfileForm);
document.getElementById("logoutBtn").addEventListener("click",async()=>{try{await signOut(auth);closeAccount()}catch(error){showError("Couldn't logout. Please try again.")}});

onAuthStateChanged(auth,async user=>{
 currentUser=user;
 if(user){
   try{await loadCustomerProfile(user);}catch(error){console.error("Auth profile load failed:",error);currentProfile={uid:user.uid,name:user.displayName||"",phone:"",address:"",email:user.email||""};}
   subscribeCustomerOrders();
   if(!hasCompleteProfile()){accountLabel.textContent="Account";if(document.body.dataset.accountNeedsProfile==="1")openProfileForm();}
   else{showLoggedIn();}
 }else{currentProfile=null;customerOrders=[];subscribeCustomerOrders();const headerAvatar=document.getElementById("headerAvatar");if(headerAvatar)headerAvatar.innerHTML=`<span class="brown-emoji">👤</span>`;accountLabel.textContent="Account";}
});

onSnapshot(query(collection(db,"products"),where("visible","==",true)),(snapshot)=>{
  products=snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.visible!==false && getStock(p)>0);
  products.sort((a,b)=>{
    const ta=a.createdAt?.toMillis?.()||0, tb=b.createdAt?.toMillis?.()||0;
    return tb-ta;
  });
  renderAlbums();
  filterProducts();
},(error)=>{
  console.error("Products listener error:",error);
  products=[];
  filterProducts();
});

renderStoreContact();renderFeedbacks();renderCustomerOrders();renderAlbums();displayProducts();updateCart();
