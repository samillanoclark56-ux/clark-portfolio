import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
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

const defaultProducts = [
  {id:"sample-1",name:"Soft Linen Blouse",category:"Tops",price:399,cost:220,stock:8,image:"https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=700&q=80",description:"Soft and comfortable blouse for everyday wear.",visible:true},
  {id:"sample-2",name:"Classic Midi Dress",category:"Dresses",price:599,cost:330,stock:5,image:"https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=80",description:"Elegant midi dress for effortless feminine style.",visible:true},
  {id:"sample-3",name:"Everyday Wide Pants",category:"Bottoms",price:499,cost:280,stock:3,image:"https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=80",description:"Relaxed wide-leg pants.",visible:true},
  {id:"sample-4",name:"Luna Co-ord Set",category:"Sets",price:699,cost:390,stock:2,image:"https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=700&q=80",description:"Chic matching set.",visible:true},
  {id:"sample-5",name:"Ribbed Basic Top",category:"Tops",price:299,cost:160,stock:12,image:"https://images.unsplash.com/photo-1564257577054-1c4d7b1a9c0d?auto=format&fit=crop&w=700&q=80",description:"Versatile basic top.",visible:true},
  {id:"sample-6",name:"Amara Summer Dress",category:"New",price:649,cost:360,stock:0,image:"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=80",description:"Light and feminine summer dress.",visible:true}
];

let products = [];
let orders = [];
let activeOrderStatus = "All";
let unsubscribeProducts = null;
let unsubscribeOrders = null;
let ownerReady = false;

const $ = id => document.getElementById(id);
const money = n => "₱" + Number(n || 0).toLocaleString("en-PH");
const fallbackImage = "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=80";

function showAuthError(message){ $("authError").textContent = message; }
function clearAuthError(){ $("authError").textContent = ""; }

async function applyPersistence(remember){
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

async function verifyOwner(user){
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() && snap.data()?.role === "owner";
}

function startRealtimeData(){
  if(unsubscribeProducts) unsubscribeProducts();
  if(unsubscribeOrders) unsubscribeOrders();

  unsubscribeProducts = onSnapshot(collection(db,"products"), snapshot => {
    products = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
    products.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    renderAll();
  }, error => console.error("Products listener error:", error));

  unsubscribeOrders = onSnapshot(collection(db,"orders"), snapshot => {
    orders = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
    orders.sort((a,b) => getOrderTime(b) - getOrderTime(a));
    renderAll();
  }, error => console.error("Orders listener error:", error));
}

function getOrderTime(o){
  return o.createdAt?.toMillis?.() || (o.date ? new Date(o.date).getTime() : 0) || 0;
}
function monthKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`}
function lastMonthKey(){const d=new Date();d.setMonth(d.getMonth()-1);return monthKey(d)}
function orderMonth(o){return monthKey(new Date(getOrderTime(o)))}
function completedOrSales(o){return ["Completed","Shipped","Preparing","Confirmed"].includes(o.status)}
function getCost(id,fallback=0){const p=products.find(x=>x.id===id);return p?Number(p.cost||0):Number(fallback||0)}
function monthStats(key){
  const os=orders.filter(o=>orderMonth(o)===key&&completedOrSales(o));
  const sales=os.reduce((s,o)=>s+Number(o.total||0),0);
  const profit=os.reduce((s,o)=>s+(o.items||[]).reduce((x,i)=>x+(Number(i.price||0)-getCost(i.id,i.cost))*Number(i.quantity||0),0),0);
  const units=os.reduce((s,o)=>s+(o.items||[]).reduce((x,i)=>x+Number(i.quantity||0),0),0);
  return {orders:os.length,sales,profit,units,os};
}

function navigate(page){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(page+"Page").classList.add("active");
  $("pageTitle").textContent=page[0].toUpperCase()+page.slice(1);
  $("sidebar").classList.remove("open");
  renderAll();
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("viewStore").addEventListener("click",()=>{window.location.href="../Khai's-Customer/index.html"});

function renderDashboard(){
 const cur=monthStats(monthKey()),last=monthStats(lastMonthKey());
 $("monthSales").textContent=money(cur.sales);$("monthProfit").textContent=money(cur.profit);$("monthOrders").textContent=cur.orders;$("productCount").textContent=products.length;
 $("salesChange").textContent=last.sales?`${cur.sales>=last.sales?"↑":"↓"} ${Math.abs(((cur.sales-last.sales)/last.sales)*100).toFixed(0)}% vs last month`:"No previous sales";
 $("profitChange").textContent=last.profit?`${cur.profit>=last.profit?"↑":"↓"} ${Math.abs(((cur.profit-last.profit)/last.profit)*100).toFixed(0)}% vs last month`:"Based on cost price";
 const low=products.filter(p=>p.stock<=3).length;$("stockWarning").textContent=low?`${low} product${low>1?"s":""} need attention`:"All inventory healthy";
 renderChart();renderBestSellers($("bestSellers"));renderRecentOrders();renderInventoryAlert();
}
function renderChart(){
 const wrap=$("salesChart");wrap.innerHTML="";const now=new Date(),days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
 const values=Array.from({length:Math.min(days,15)},(_,i)=>{const day=Math.floor((i*days)/Math.min(days,15))+1;return orders.filter(o=>{const d=new Date(getOrderTime(o));return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===day&&completedOrSales(o)}).reduce((s,o)=>s+Number(o.total||0),0)});
 const max=Math.max(...values,1);values.forEach((v,i)=>{const box=document.createElement("div");box.className="bar-wrap";box.innerHTML=`<div class="bar" style="height:${Math.max(3,v/max*92)}%"></div><div class="bar-label">${i+1}</div>`;wrap.appendChild(box)});
}
function renderBestSellers(target){
 const map={};orders.filter(completedOrSales).forEach(o=>(o.items||[]).forEach(i=>{map[i.id]=(map[i.id]||0)+Number(i.quantity||0)}));
 const arr=products.map(p=>({...p,sold:map[p.id]||0})).sort((a,b)=>b.sold-a.sold).slice(0,5);
 target.innerHTML=arr.length?arr.map(p=>`<div class="list-row"><img src="${p.image||fallbackImage}"><div class="grow"><strong>${p.name}</strong><small>${p.category}</small></div><b>${p.sold} sold</b></div>`).join(""):`<div class="empty-state">No sales yet.</div>`;
}
function renderRecentOrders(){
 const arr=[...orders].sort((a,b)=>getOrderTime(b)-getOrderTime(a)).slice(0,5);
 $("recentOrders").innerHTML=arr.length?arr.map(o=>`<div class="mini-order"><div><strong>${o.id}</strong><small>${o.customer?.name||"Customer"}</small></div><b>${money(o.total)}</b><span class="status ${o.status}">${o.status}</span></div>`).join(""):`<div class="empty-state">No orders yet.</div>`;
}
function renderInventoryAlert(){
 const arr=products.filter(p=>Number(p.stock)<=3).sort((a,b)=>Number(a.stock)-Number(b.stock)).slice(0,5);
 $("inventoryAlert").innerHTML=arr.length?arr.map(p=>`<div class="list-row"><img src="${p.image||fallbackImage}"><div class="grow"><strong>${p.name}</strong><small class="${p.stock===0?"low":"good"}">${p.stock===0?"Sold out":p.stock+" left"}</small></div><b>${p.stock}</b></div>`).join(""):`<div class="empty-state">Inventory looks good.</div>`;
}

function renderProducts(){
 const term=($("productSearch").value||"").toLowerCase(),cat=$("productFilter").value;
 const arr=products.filter(p=>(cat==="All"||p.category===cat)&&String(p.name||"").toLowerCase().includes(term));
 $("productAdminGrid").innerHTML=arr.map(p=>`<article class="admin-product ${p.visible!==false?"":"off"}">
 <img src="${p.image||fallbackImage}" alt="${p.name||"Product"}">
 <div class="admin-product-body"><div class="product-meta"><span>${p.category||"Other"}</span><span>${p.visible!==false?"Visible":"Hidden"}</span></div>
 <h3>${p.name||"Untitled"}</h3><div class="admin-size-list">${sizeLabels(p.sizes)}</div><div class="price-line"><strong>${money(p.price)}</strong><small>Cost ${money(p.cost)} · Stock ${Number(p.stock||0)}</small></div>
 <div class="admin-actions"><button class="small-btn" onclick='editProduct(${JSON.stringify(p.id)})'>Edit</button><button class="small-btn" onclick='toggleProduct(${JSON.stringify(p.id)})'>${p.visible!==false?"Hide":"Show"}</button><button class="small-btn danger" onclick='deleteProduct(${JSON.stringify(p.id)})'>Delete</button></div></div></article>`).join("")||`<div class="empty-state">No products found.</div>`;
}
$("productSearch").addEventListener("input",renderProducts);$("productFilter").addEventListener("change",renderProducts);
function getSelectedSizes(){
 return Array.from(document.querySelectorAll('#productSizes input[type="checkbox"]:checked')).map(input=>input.value);
}
function setSelectedSizes(sizes=[]){
 const selected=new Set(Array.isArray(sizes)?sizes:[]);
 document.querySelectorAll('#productSizes input[type="checkbox"]').forEach(input=>{input.checked=selected.has(input.value);});
}
function sizeLabels(sizes=[]){
 return Array.isArray(sizes)&&sizes.length?sizes.join(' · '):'No sizes selected';
}

function openProductModal(id=null){
 $("productForm").reset();$("editProductId").value=id||"";
 setSelectedSizes([]);
 $("imagePreviewWrap").hidden=true;$("imagePreview").removeAttribute("src");
 if(id!==null&&id!==""){
   const p=products.find(x=>String(x.id)===String(id));if(!p)return;
   $("productModalTitle").textContent="Edit Product";
   $("productName").value=p.name||"";$("productCategory").value=p.category||"Tops";
   $("productStock").value=Number(p.stock||0);$("productPrice").value=Number(p.price||0);$("productCost").value=Number(p.cost||0);
   $("productDescription").value=p.description||"";$("productVisible").checked=p.visible!==false;
   setSelectedSizes(p.sizes||[]);
   $("productImage").dataset.currentUrl=p.image||"";
   if(p.image){$("imagePreview").src=p.image;$("imagePreviewWrap").hidden=false;}
 } else {
   $("productModalTitle").textContent="Add Product";$("productVisible").checked=true;$("productImage").dataset.currentUrl="";
 }
 $("productModal").classList.add("show");
}

$("productImage").addEventListener("change",e=>{
 const file=e.target.files?.[0];
 if(!file){return;}
 if(!file.type.startsWith("image/")){alert("Please choose an image file.");e.target.value="";return;}
 const url=URL.createObjectURL(file);$("imagePreview").src=url;$("imagePreviewWrap").hidden=false;
});

$("addProductBtn").addEventListener("click",()=>openProductModal());$("dashboardAdd").addEventListener("click",()=>{navigate("products");openProductModal()});
$("closeProductModal").addEventListener("click",()=>$("productModal").classList.remove("show"));$("cancelProduct").addEventListener("click",()=>$("productModal").classList.remove("show"));
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const id=$("editProductId").value;
 const file=$("productImage").files?.[0];
 try{
   let imageUrl=$("productImage").dataset.currentUrl||"";
   if(file){
     if(file.size>8*1024*1024){alert("Image is too large. Please choose an image under 8MB.");return;}
     const formData = new FormData();
     formData.append("file", file);
     formData.append("upload_preset", "Khai's_products");
     formData.append("folder", "khai-products");

     const cloudinaryResponse = await fetch(
       "https://api.cloudinary.com/v1_1/zeuidhev/image/upload",
       { method: "POST", body: formData }
     );

     if (!cloudinaryResponse.ok) {
       const details = await cloudinaryResponse.text();
       console.error("Cloudinary upload failed:", details);
       throw new Error("Cloudinary image upload failed.");
     }

     const uploaded = await cloudinaryResponse.json();
     imageUrl = uploaded.secure_url || uploaded.url;
     if (!imageUrl) throw new Error("Cloudinary did not return an image URL.");
   }
   const sizes=getSelectedSizes();
   if(!sizes.length){alert("Please select at least one available size.");return;}
   const data={name:$("productName").value.trim(),category:$("productCategory").value,stock:Number($("productStock").value),price:Number($("productPrice").value),cost:Number($("productCost").value),sizes,image:imageUrl||fallbackImage,description:$("productDescription").value.trim(),visible:$("productVisible").checked,updatedAt:serverTimestamp()};
   if(id){await updateDoc(doc(db,"products",id),data)}
   else{const productRef=doc(collection(db,"products"));await setDoc(productRef,{...data,id:productRef.id,createdAt:serverTimestamp()})}
   $("productModal").classList.remove("show");$("productForm").reset();
 }catch(error){console.error("Save product error:",error);alert(`Couldn't save product. ${error.message || "Please try again."}`)}
});
window.editProduct=openProductModal;
window.toggleProduct=async id=>{const p=products.find(x=>String(x.id)===String(id));if(!p)return;try{await updateDoc(doc(db,"products",id),{visible:p.visible===false,updatedAt:serverTimestamp()})}catch(error){console.error(error);alert("Couldn't update product.")}};
window.deleteProduct=async id=>{const p=products.find(x=>String(x.id)===String(id));if(!p)return;if(confirm(`Delete "${p.name}"? This will remove it from the Customer Store.`)){try{await deleteDoc(doc(db,"products",id))}catch(error){console.error(error);alert("Couldn't delete product. Check your Firestore rules.")}}};

function renderOrders(){
 const arr=orders.filter(o=>activeOrderStatus==="All"||o.status===activeOrderStatus).sort((a,b)=>getOrderTime(b)-getOrderTime(a));
 $("ordersTable").innerHTML=arr.map(o=>`<tr><td><strong>${o.id}</strong></td><td class="table-customer"><strong>${o.customer?.name||"Customer"}</strong><small>${o.customer?.phone||""}</small></td><td>${(o.items||[]).reduce((s,i)=>s+Number(i.quantity||0),0)} item(s)</td><td><strong>${money(o.total)}</strong></td><td><span class="status ${o.status}">${o.status}</span></td><td>${getOrderTime(o)?new Date(getOrderTime(o)).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}):"—"}</td><td><button class="view-btn" onclick='openOrder(${JSON.stringify(o.id)})'>View</button></td></tr>`).join("");
 $("ordersEmpty").style.display=arr.length?"none":"block";
}
document.querySelectorAll(".order-tabs button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".order-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeOrderStatus=b.dataset.status;renderOrders()}));
window.openOrder=id=>{const o=orders.find(x=>String(x.id)===String(id));if(!o)return;$("orderModalTitle").textContent=o.id;$("orderDetailContent").innerHTML=`<div class="detail-row"><span>Customer</span><strong>${o.customer?.name||""}</strong></div><div class="detail-row"><span>Phone</span><strong>${o.customer?.phone||""}</strong></div><div class="detail-row"><span>Address</span><strong>${o.customer?.address||""}</strong></div><div class="detail-row"><span>Payment</span><strong>${o.customer?.payment||"COD"}</strong></div><div class="detail-row"><span>Status</span><select id="orderStatusChange"><option>Pending</option><option>Confirmed</option><option>Preparing</option><option>Shipped</option><option>Completed</option></select></div><div class="detail-items">${(o.items||[]).map(i=>`<div class="detail-item"><img src="${i.image||fallbackImage}"><div><strong>${i.name}</strong><small>Size ${i.size||"—"} · Qty ${i.quantity}</small></div><b>${money(Number(i.price||0)*Number(i.quantity||0))}</b></div>`).join("")}</div><div class="detail-row"><span>Total</span><strong>${money(o.total)}</strong></div>`;$("orderStatusChange").value=o.status||"Pending";$("orderStatusChange").addEventListener("change",async e=>{try{await updateDoc(doc(db,"orders",o.id),{status:e.target.value,updatedAt:serverTimestamp()});$("orderModal").classList.remove("show")}catch(error){console.error(error);alert("Couldn't update order.")}});$("orderModal").classList.add("show")};
$("closeOrderModal").addEventListener("click",()=>$("orderModal").classList.remove("show"));

function renderInventory(){
 const units=products.reduce((s,p)=>s+Number(p.stock||0),0),low=products.filter(p=>p.stock>0&&p.stock<=3).length,sold=products.filter(p=>p.stock===0).length;
 $("totalUnits").textContent=units;$("lowStockCount").textContent=low;$("soldOutCount").textContent=sold;
 $("inventoryGrid").innerHTML=products.map(p=>`<div class="inventory-item"><img src="${p.image||fallbackImage}"><div class="grow"><strong>${p.name}</strong><small class="${p.stock<=3?"low":"good"}">${p.stock===0?"Sold out":p.stock<=3?"Low stock":"In stock"}</small></div><div class="stock-control"><button onclick='changeStock(${JSON.stringify(p.id)},-1)'>−</button><span>${Number(p.stock||0)}</span><button onclick='changeStock(${JSON.stringify(p.id)},1)'>+</button></div></div>`).join("");
}
window.changeStock=async(id,delta)=>{const p=products.find(x=>String(x.id)===String(id));if(!p)return;const next=Math.max(0,Number(p.stock||0)+delta);try{await updateDoc(doc(db,"products",id),{stock:next,updatedAt:serverTimestamp()})}catch(error){console.error(error);alert("Couldn't update stock.")}};

function renderAnalytics(){
 const cur=monthStats(monthKey()),last=monthStats(lastMonthKey());
 $("analyticsSales").textContent=money(cur.sales);$("analyticsSalesLast").textContent=`Last month ${money(last.sales)}`;$("analyticsProfit").textContent=money(cur.profit);$("analyticsProfitLast").textContent=`Last month ${money(last.profit)}`;$("analyticsOrders").textContent=cur.orders;$("analyticsOrdersLast").textContent=`Last month ${last.orders}`;
 $("salesProgress").style.width=(last.sales?Math.min(100,cur.sales/last.sales*100):cur.sales?100:0)+"%";$("profitProgress").style.width=(last.profit?Math.min(100,cur.profit/last.profit*100):cur.profit?100:0)+"%";$("ordersProgress").style.width=(last.orders?Math.min(100,cur.orders/last.orders*100):cur.orders?100:0)+"%";
 const now=new Date(),months=[];for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:monthKey(d),label:d.toLocaleString("en",{month:"short"})})}
 const vals=months.map(m=>monthStats(m.key).sales),max=Math.max(...vals,1);$("yearBars").innerHTML=months.map((m,i)=>`<div class="year-bar-wrap"><div class="year-bar" style="height:${Math.max(3,vals[i]/max*90)}%"></div><span>${m.label}</span></div>`).join("");
 renderBestSellers($("analyticsBest"));const margins=products.map(p=>({...p,margin:Number(p.price||0)-Number(p.cost||0)})).sort((a,b)=>b.margin-a.margin).slice(0,5);$("marginList").innerHTML=margins.map(p=>`<div class="list-row"><div class="grow"><strong>${p.name}</strong><small>${money(p.price-p.cost)} profit per item</small></div><b>${p.price?Math.round((p.price-p.cost)/p.price*100):0}%</b></div>`).join("");
}
function renderAll(){if(!ownerReady)return;renderDashboard();renderProducts();renderOrders();renderInventory();renderAnalytics();$("pendingBadge").textContent=orders.filter(o=>o.status==="Pending").length;$("notificationDot").style.display=orders.some(o=>o.status==="Pending")?"block":"none"}

// Owner authentication
$("showOwnerPassword").addEventListener("click",()=>{const input=$("ownerPassword");const visible=input.type==="text";input.type=visible?"password":"text";$("showOwnerPassword").textContent=visible?"Show":"Hide"});
$("ownerLoginForm").addEventListener("submit",async e=>{e.preventDefault();clearAuthError();try{await applyPersistence($("rememberOwner").checked);await signInWithEmailAndPassword(auth,$("ownerEmail").value.trim(),$("ownerPassword").value)}catch(error){console.error(error);showAuthError(error.code==="auth/invalid-credential"?"Incorrect email or password.":error.message)}});
$("ownerLogout").addEventListener("click",async()=>{await signOut(auth)});

onAuthStateChanged(auth,async user=>{
 if(!user){ownerReady=false;$("authGate").classList.remove("hidden");if(unsubscribeProducts)unsubscribeProducts();if(unsubscribeOrders)unsubscribeOrders();return}
 try{
   const allowed=await verifyOwner(user);
   if(!allowed){await signOut(auth);showAuthError("This account is not authorized as the store owner yet. Create users/UID with role: owner in Firestore.");return}
   ownerReady=true;$("ownerNameLabel").textContent=user.displayName||"Owner";$("ownerEmailLabel").textContent=user.email||"Owner";$("authGate").classList.add("hidden");clearAuthError();startRealtimeData();renderAll();
 }catch(error){console.error(error);await signOut(auth);showAuthError("Could not verify owner access. Check Firestore rules.")}
});
