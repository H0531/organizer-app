'use client'
import{useState}from'react'
const SP:Record<string,{label:string;items:{text:string;badge?:string}[]}> = {desk:{label:'書桌整理清單',items:[{text:'清空桌面所有物品',badge:'必做'},{text:'分類文件文具雜物'},{text:'丟棄過期收據廢紙'},{text:'文具只留常用3支筆'},{text:'電線整理貼上標籤'},{text:'桌面只留今日必要物品'}]},wardrobe:{label:'衣櫃整理清單',items:[{text:'全部衣物取出攤開',badge:'必做'},{text:'依類型分堆上衣褲外套'},{text:'超過一年未穿考慮送出'},{text:'破損變形衣物直接淘汰'},{text:'常穿放前方少穿放後方'},{text:'折疊統一方式直立收納'}]},kitchen:{label:'廚房整理清單',items:[{text:'清查過期食品與調味料',badge:'必做'},{text:'餐具統計過多的送出'},{text:'常用鍋具放瓦斯爐旁'},{text:'塑膠袋只留10個'},{text:'清潔用品集中一區'},{text:'冰箱門背貼購物清單欄'}]},bathroom:{label:'浴室整理清單',items:[{text:'清查過期保養品藥品',badge:'必做'},{text:'只留1套備用備品'},{text:'毛巾超過3條斷捨離'},{text:'瓶瓶罐罐整理到收納架'},{text:'清除水垢黴菌'},{text:'放一個小香氛提升儀式感'}]},bag:{label:'包包整理清單',items:[{text:'倒出所有東西',badge:'必做'},{text:'丟棄發票廢紙屑'},{text:'零錢集中到錢包'},{text:'超過3個購物袋只留一個'},{text:'藥品確認是否過期'},{text:'常用物品分區放小包'}]},digital:{label:'數位整理清單',items:[{text:'截圖資料夾整理或刪除',badge:'必做'},{text:'手機App超過3頁刪一輪'},{text:'相簿備份到雲端'},{text:'訂閱email取消不需要的'},{text:'桌面資料夾分類命名'},{text:'清除瀏覽器書籤'}]}}
const PD=[{name:'PP收納盒大',brand:'無印良品',w:37,d:26,h:17,types:['shelf','drawer','wardrobe'],fit:'perfect'},{name:'PP收納盒中',brand:'無印良品',w:25,d:20,h:14,types:['shelf','drawer','wardrobe'],fit:'perfect'},{name:'SKUBB衣物整理盒',brand:'IKEA',w:44,d:55,h:19,types:['wardrobe','under'],fit:'perfect'},{name:'SAMLA透明收納箱',brand:'IKEA',w:57,d:39,h:28,types:['under','shelf'],fit:'perfect'},{name:'軟質整理盒6格',brand:'DAISO',w:32,d:22,h:10,types:['drawer'],fit:'perfect'},{name:'床下扁型收納盒',brand:'NITORI',w:74,d:40,h:14,types:['under'],fit:'perfect'},{name:'不織布衣物收納袋',brand:'NITORI',w:40,d:25,h:30,types:['wardrobe'],fit:'perfect'},{name:'桌面整理架竹製',brand:'誠品生活',w:28,d:18,h:22,types:['shelf'],fit:'perfect'},{name:'KUGGIS收納盒附蓋',brand:'IKEA',w:37,d:54,h:21,types:['shelf','wardrobe','under'],fit:'ok'},{name:'PP資料盒薄型',brand:'無印良品',w:10,d:32,h:24,types:['shelf','drawer'],fit:'ok'}]
const SI:Record<string,string>={desk:'🗂',wardrobe:'👕',kitchen:'🍳',bathroom:'🪥',bag:'👜',digital:'📱'}
const SN:Record<string,string>={desk:'書桌',wardrobe:'衣櫃',kitchen:'廚房',bathroom:'浴室',bag:'包包',digital:'數位'}
export default function Home(){
const[tab,setTab]=useState<'checklist'|'declutter'|'recommend'|'guide'>('checklist')
const[space,setSpace]=useState('desk')
const[checked,setChecked]=useState<Record<string,boolean[]>>({})
const[items,setItems]=useState<{name:string;decision:string|null}[]>([])
const[input,setInput]=useState('')
const[mW,setMW]=useState('')
const[mD,setMD]=useState('')
const[mH,setMH]=useState('')
const[spaceType,setSpaceType]=useState('shelf')
const getC=()=>checked[space]||SP[space].items.map(()=>false)
const toggleC=(i:number)=>{const c=getC();const n=[...c];n[i]=!n[i];setChecked({...checked,[space]:n})}
const done=getC().filter(Boolean).length
const total=SP[space].items.length
const pct=total?Math.round((done/total)*100):0
const addItem=(name?:string)=>{const v=name||input.trim();if(!v)return;setItems([...items,{name:v,decision:null}]);setInput('')}
const setDec=(i:number,d:string)=>{const n=[...items];n[i].decision=n[i].decision===d?null:d;setItems(n)}
const prods=PD.filter(p=>{const w=parseFloat(mW),d=parseFloat(mD),h=parseFloat(mH);return p.types.includes(spaceType)&&(!mW||p.w<=w+5)&&(!mD||p.d<=d+5)&&(!mH||p.h<=h+5)}).slice(0,4)
const bg='#F5F0E8',ww='#FAF8F4',ink='#2C2820',sg='#7A9E8A',bd='#DDD8CF',ml='#6B6358',mf='#A39B8E',cr='#EDE8DD'

// 超連結樣式：點擊後切換 tab
const TabLink=({target,children}:{target:'checklist'|'declutter'|'recommend';children:string})=>(
  <span
    onClick={()=>setTab(target)}
    style={{color:sg,textDecoration:'underline',cursor:'pointer',fontWeight:500}}
  >
    {children}
  </span>
)

return(<div style={{minHeight:'100vh',background:bg,fontFamily:"'Noto Sans TC',sans-serif"}}>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet"/>
<nav style={{background:ww,borderBottom:`1px solid ${bd}`,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:56,position:'sticky',top:0,zIndex:100}}>
<div style={{fontFamily:"'Noto Serif TC',serif",fontWeight:700,fontSize:17,color:ink}}>整理<span style={{color:sg}}>•</span>小幫手</div>
<div style={{display:'flex',gap:4}}>{(['checklist','declutter','recommend','guide'] as const).map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:'6px 16px',borderRadius:20,border:'none',background:tab===t?ink:'transparent',color:tab===t?ww:ml,fontSize:13,cursor:'pointer',fontWeight:tab===t?500:400}}>{t==='checklist'?'整理清單':t==='declutter'?'斷捨離':t==='recommend'?'收納推薦':'使用說明'}</button>))}</div>
</nav>
<div style={{padding:'32px 24px',maxWidth:760,margin:'0 auto'}}>

{tab==='checklist'&&<><h1 style={{fontFamily:"'Noto Serif TC',serif",fontSize:26,fontWeight:700,marginBottom:6,color:ink}}>今天整理哪裡？</h1><p style={{color:ml,fontSize:14,marginBottom:28}}>選一個空間，開始今日的整理任務</p><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>{Object.keys(SP).map(k=>(<button key={k} onClick={()=>setSpace(k)} style={{padding:'14px 10px',border:space===k?`2px solid ${sg}`:`1px solid ${bd}`,borderRadius:10,background:space===k?'#EAF2EE':ww,cursor:'pointer',textAlign:'center'}}><span style={{fontSize:22,display:'block',marginBottom:4}}>{SI[k]}</span><span style={{fontSize:13,color:ink}}>{SN[k]}</span></button>))}</div><div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'20px 24px'}}><div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>{SP[space].label}</div>{SP[space].items.map((item,i)=>(<div key={i} onClick={()=>toggleC(i)} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:i<total-1?`1px solid ${cr}`:'none',cursor:'pointer'}}><div style={{width:20,height:20,border:getC()[i]?'none':`1.5px solid ${bd}`,borderRadius:5,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:getC()[i]?sg:'white'}}>{getC()[i]&&<svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div><span style={{fontSize:14,flex:1,textDecoration:getC()[i]?'line-through':'none',color:getC()[i]?mf:ink}}>{item.text}</span>{item.badge&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#F0E2C0',color:'#C4953A',fontWeight:500}}>{item.badge}</span>}</div>))}<div style={{background:cr,borderRadius:4,height:6,marginTop:16,overflow:'hidden'}}><div style={{height:'100%',borderRadius:4,background:sg,width:`${pct}%`,transition:'width 0.4s'}}/></div><div style={{fontSize:12,color:mf,marginTop:6,textAlign:'right'}}>{done} / {total} 完成</div></div></>}

{tab==='declutter'&&<><h1 style={{fontFamily:"'Noto Serif TC',serif",fontSize:26,fontWeight:700,marginBottom:6,color:ink}}>斷捨離決策</h1><p style={{color:ml,fontSize:14,marginBottom:28}}>逐一判斷每件物品的去留</p><div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'20px 24px',marginBottom:16}}><div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>新增物品</div><div style={{display:'flex',gap:10,marginBottom:16}}><input style={{flex:1,border:`1px solid ${bd}`,borderRadius:8,padding:'10px 14px',fontSize:14,background:'white',color:ink,outline:'none'}} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()} placeholder="例：三年沒穿的外套"/><button style={{padding:'10px 18px',borderRadius:8,border:'none',fontSize:14,cursor:'pointer',fontWeight:500,background:ink,color:'white'}} onClick={()=>addItem()}>加入</button></div><div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}><span style={{fontSize:12,color:mf}}>快速加：</span>{['備用充電線','舊T-shirt','過期保養品','購物袋'].map(n=>(<button key={n} style={{padding:'5px 12px',borderRadius:6,border:'none',fontSize:12,cursor:'pointer',background:cr,color:ml}} onClick={()=>addItem(n)}>{n}</button>))}</div></div><div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'20px 24px'}}><div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>等待判斷</div>{items.length===0?<div style={{textAlign:'center',padding:'28px 0',color:mf,fontSize:14}}>從上方加入第一件物品</div>:<>{items.map((item,i)=>(<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:`1px solid ${cr}`,gap:12}}><span style={{fontSize:14,flex:1,color:ink}}>{item.name}</span><div style={{display:'flex',gap:6}}>{(['keep','donate','toss'] as const).map(d=>{const ac=item.decision===d;const col=d==='keep'?sg:d==='donate'?'#C47B5A':mf;return<button key={d} onClick={()=>setDec(i,d)} style={{padding:'4px 12px',borderRadius:20,border:`1px solid ${col}`,background:ac?col:'white',color:ac?'white':col,fontSize:12,cursor:'pointer'}}>{d==='keep'?'留':d==='donate'?'送':'丟'}</button>})}</div></div>))}<div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap'}}>{([['keep','留下','#EAF2EE',sg],['donate','送出','#F0D5C8','#C47B5A'],['toss','丟棄',cr,ml]] as const).map(([d,label,bg2,col])=>(<span key={d} style={{padding:'5px 14px',borderRadius:20,fontSize:13,fontWeight:500,background:bg2,color:col}}>{label} {items.filter(x=>x.decision===d).length}</span>))}</div></>}</div></>}

{tab==='recommend'&&<><h1 style={{fontFamily:"'Noto Serif TC',serif",fontSize:26,fontWeight:700,marginBottom:6,color:ink}}>收納品推薦</h1><p style={{color:ml,fontSize:14,marginBottom:28}}>輸入空間尺寸，找到適合的收納工具</p><div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'20px 24px',marginBottom:16}}><div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>空間尺寸</div><select value={spaceType} onChange={e=>setSpaceType(e.target.value)} style={{width:'100%',border:`1px solid ${bd}`,borderRadius:8,padding:'10px 14px',fontSize:14,background:'white',color:ink,marginBottom:12,outline:'none'}}><option value="shelf">層架書架</option><option value="drawer">抽屜</option><option value="under">床底沙發下</option><option value="wardrobe">衣櫃內部</option></select><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>{([['寬度',mW,setMW],['深度',mD,setMD],['高度',mH,setMH]] as [string,string,(v:string)=>void][]).map(([label,val,setter])=>(<div key={label}><div style={{fontSize:12,color:mf,marginBottom:5,fontWeight:500}}>{label}</div><input type="number" style={{width:'100%',border:`1px solid ${bd}`,borderRadius:8,padding:'10px 12px',fontSize:15,background:'white',color:ink,outline:'none',textAlign:'center'}} value={val} onChange={e=>setter(e.target.value)} placeholder="0"/><div style={{fontSize:12,color:mf,textAlign:'center',marginTop:4}}>公分</div></div>))}</div></div><div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'20px 24px'}}><div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>推薦商品</div>{(!mW&&!mD&&!mH)?<div style={{textAlign:'center',padding:'28px 0',color:mf,fontSize:14}}>輸入尺寸後自動推薦</div>:prods.length===0?<div style={{textAlign:'center',padding:'28px 0',color:mf,fontSize:14}}>找不到符合商品</div>:<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{prods.map((p,i)=>(<div key={i} style={{border:`1px solid ${bd}`,borderRadius:10,padding:'14px 16px',background:'white'}}><div style={{fontSize:14,fontWeight:500,marginBottom:4,color:ink}}>{p.name}</div><div style={{fontSize:11,color:mf,marginBottom:4,textAlign:'right'}}>{p.brand}</div><div style={{fontSize:12,color:ml,marginBottom:8}}>{p.w}x{p.d}x{p.h} cm</div><span style={{fontSize:11,padding:'3px 8px',borderRadius:8,background:p.fit==='perfect'?'#EAF2EE':'#F0E2C0',color:p.fit==='perfect'?sg:'#C4953A',fontWeight:500,display:'inline-block'}}>{p.fit==='perfect'?'完美符合':'可以使用'}</span></div>))}</div>}</div></>}

{tab==='guide'&&<>
<h1 style={{fontFamily:"'Noto Serif TC',serif",fontSize:26,fontWeight:700,marginBottom:6,color:ink}}>使用說明</h1>
<p style={{color:ml,fontSize:14,marginBottom:32}}>整理，不是把東西收起來，是讓生活更輕盈。</p>

{/* 關於 */}
<div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'24px 28px',marginBottom:16}}>
  <div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase' as const,letterSpacing:'0.08em',marginBottom:12}}>關於整理．小幫手</div>
  <p style={{fontSize:14,color:ink,lineHeight:1.8,marginBottom:12}}>
    整理小幫手是一個免費的線上工具，專為忙碌、不知道從哪裡開始整理的人設計。它把整理師的專業思維，轉化為三個簡單易用的功能，讓你不需要任何整理知識，也能一步一步動起來。
  </p>
  <p style={{fontSize:14,color:ml,lineHeight:1.8}}>
    你不需要一次整理整間房子。今天只整理書桌，明天只整理包包，每天 15 分鐘，三個月後你的生活會是另一個樣子。
  </p>
</div>

{/* 功能一 */}
<div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'24px 28px',marginBottom:16}}>
  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
    <span style={{fontSize:20}}>🗂</span>
    <div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase' as const,letterSpacing:'0.08em'}}>功能一：整理清單</div>
  </div>
  <p style={{fontSize:14,color:ink,lineHeight:1.8,marginBottom:16}}>
    選一個今天想整理的空間，跟著清單一步一步完成，不用自己想、不用自己規劃，打勾就好。
  </p>
  <div style={{fontSize:13,fontWeight:500,color:ink,marginBottom:10}}>使用步驟</div>
  {[
    <span key="1">點選上方 <TabLink target="checklist">整理清單</TabLink> 分頁</span>,
    <span key="2">從六個空間按鈕中選一個今天要整理的空間</span>,
    <span key="3">依序點擊清單項目打勾，完成一項勾一項</span>,
    <span key="4">觀察下方進度條，看到 6/6 完成就大功告成</span>,
  ].map((step,i)=>(
    <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'8px 0',borderBottom:i<3?`1px solid ${cr}`:'none'}}>
      <span style={{width:20,height:20,borderRadius:'50%',background:sg,color:'white',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{i+1}</span>
      <span style={{fontSize:14,color:ink,lineHeight:1.7}}>{step}</span>
    </div>
  ))}
</div>

{/* 功能二 */}
<div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'24px 28px',marginBottom:16}}>
  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
    <span style={{fontSize:20}}>♻️</span>
    <div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase' as const,letterSpacing:'0.08em'}}>功能二：斷捨離決策</div>
  </div>
  <p style={{fontSize:14,color:ink,lineHeight:1.8,marginBottom:12}}>
    面對那些「說不定哪天會用到」的物品，用這個工具逐一做決定。每件東西只有三個選項：
  </p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:16}}>
    {[['留','#EAF2EE',sg,'這件東西在我的生活中有明確的位置和用途'],['送','#F0D5C8','#C47B5A','我不需要，但它對別人還有價值'],['丟',cr,ml,'損壞、過期、或真的沒人需要']].map(([label,bg2,col,desc])=>(
      <div key={label} style={{padding:'10px 14px',borderRadius:8,background:bg2,flex:'1',minWidth:140}}>
        <span style={{fontSize:13,fontWeight:600,color:col}}>{label}</span>
        <p style={{fontSize:12,color:ml,margin:'4px 0 0',lineHeight:1.5}}>{desc}</p>
      </div>
    ))}
  </div>
  <div style={{fontSize:13,fontWeight:500,color:ink,marginBottom:10}}>使用步驟</div>
  {[
    <span key="1">點選上方 <TabLink target="declutter">斷捨離</TabLink> 分頁</span>,
    <span key="2">在輸入欄填入物品名稱，按「加入」或 Enter</span>,
    <span key="3">對每件物品點選「留」、「送」或「丟」</span>,
    <span key="4">查看底部統計，確認三類物品的數量</span>,
  ].map((step,i)=>(
    <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'8px 0',borderBottom:i<3?`1px solid ${cr}`:'none'}}>
      <span style={{width:20,height:20,borderRadius:'50%',background:sg,color:'white',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{i+1}</span>
      <span style={{fontSize:14,color:ink,lineHeight:1.7}}>{step}</span>
    </div>
  ))}
</div>

{/* 功能三 */}
<div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'24px 28px',marginBottom:16}}>
  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
    <span style={{fontSize:20}}>📦</span>
    <div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase' as const,letterSpacing:'0.08em'}}>功能三：收納品推薦</div>
  </div>
  <p style={{fontSize:14,color:ink,lineHeight:1.8,marginBottom:16}}>
    整理完空間之後，不知道要買什麼收納品？輸入你的空間尺寸，工具會自動推薦尺寸合適的商品，讓你不再買回來才發現裝不下。
  </p>
  <div style={{fontSize:13,fontWeight:500,color:ink,marginBottom:10}}>使用步驟</div>
  {[
    <span key="1">點選上方 <TabLink target="recommend">收納推薦</TabLink> 分頁</span>,
    <span key="2">從下拉選單選擇空間類型（層架、抽屜、床底、衣櫃）</span>,
    <span key="3">輸入寬度、深度、高度（單位：公分）</span>,
    <span key="4">綠色標籤代表「完美符合」，黃色標籤代表「可以使用」</span>,
  ].map((step,i)=>(
    <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'8px 0',borderBottom:i<3?`1px solid ${cr}`:'none'}}>
      <span style={{width:20,height:20,borderRadius:'50%',background:sg,color:'white',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{i+1}</span>
      <span style={{fontSize:14,color:ink,lineHeight:1.7}}>{step}</span>
    </div>
  ))}
</div>

{/* 小技巧 */}
<div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'24px 28px',marginBottom:16}}>
  <div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase' as const,letterSpacing:'0.08em',marginBottom:14}}>整理建議與小技巧</div>
  {[
    ['從最小的空間開始','建議第一次從「包包」開始，20 分鐘內就能完成，有成就感才會想繼續'],
    ['不要貪心','一次只整理一個空間，整理完才算完成，別中途跑去整理另一個地方'],
    ['斷捨離時拿著東西判斷','用手摸到實物再決定，比看著清單回憶更準確'],
    ['先整理再買收納品','用收納品推薦功能前，先完成斷捨離，才知道實際需要收納多少東西'],
    ['固定一個整理日','每週固定一個空間，一個月就能輪完六個空間一次'],
  ].map(([title,desc],i,arr)=>(
    <div key={i} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:i<arr.length-1?`1px solid ${cr}`:'none'}}>
      <span style={{color:sg,fontSize:16,flexShrink:0,marginTop:2}}>✦</span>
      <div>
        <div style={{fontSize:14,fontWeight:500,color:ink,marginBottom:3}}>{title}</div>
        <div style={{fontSize:13,color:ml,lineHeight:1.6}}>{desc}</div>
      </div>
    </div>
  ))}
</div>

{/* 常見問題 */}
<div style={{background:ww,border:`1px solid ${bd}`,borderRadius:12,padding:'24px 28px'}}>
  <div style={{fontSize:13,fontWeight:500,color:mf,textTransform:'uppercase' as const,letterSpacing:'0.08em',marginBottom:14}}>常見問題</div>
  {[
    ['我的資料會被儲存嗎？','目前版本的打勾進度和物品清單儲存在瀏覽器本機，關掉頁面後不會保留。建議每次整理時當作當天的工作清單使用。'],
    ['可以在手機上使用嗎？','可以。網站支援手機瀏覽器，建議使用 Safari 或 Chrome 開啟，體驗與電腦版相同。'],
    ['推薦的收納商品在哪裡買？','目前推薦商品包含無印良品、IKEA、NITORI、DAISO、誠品生活的常見品項，可自行前往各品牌實體門市或官網購買。'],
    ['我想整理的空間不在清單裡怎麼辦？','目前提供書桌、衣櫃、廚房、浴室、包包、數位六種空間。如果有其他需求，歡迎回饋，未來版本將陸續新增。'],
  ].map(([q,a],i,arr)=>(
    <div key={i} style={{padding:'14px 0',borderBottom:i<arr.length-1?`1px solid ${cr}`:'none'}}>
      <div style={{fontSize:14,fontWeight:500,color:ink,marginBottom:5}}>Q：{q}</div>
      <div style={{fontSize:13,color:ml,lineHeight:1.7}}>{a}</div>
    </div>
  ))}
</div>
</>}

</div></div>)
}
