// Project: CatalogoMargu (React + Vite)
// Save these files into a project folder and deploy to Vercel (instructions in README below)

/*
PROJECT STRUCTURE (copy each block to the corresponding file):

package.json
vite.config.js
README.md
public/index.html
src/main.jsx
src/App.jsx
src/styles.css

Notes: replace ONEDRIVE_FILE_URL in src/App.jsx with your OneDrive "direct download" link if needed.
*/

--- package.json ---
{
  "name": "catalogo-margu",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}

--- vite.config.js ---
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
})

--- README.md ---
# Catálogo Margu Infantil — React (Vite)

Este proyecto convierte tu `Libro5.xlsx` en un catálogo web interactivo que abre pedidos a WhatsApp.

## Preparación rápida
1. Clona o crea una carpeta y pega los archivos del proyecto.
2. Edítalo: en `src/App.jsx` reemplaza la constante `ONEDRIVE_FILE_URL` por tu enlace público de OneDrive (descarga directa si es necesario).
3. Ejecuta:

```bash
npm install
npm run dev
```

4. Para publicar en Vercel, crea un repo o sube el ZIP al import de Vercel y deploy.

## Notas
- Si OneDrive devuelve una página intermedia, crea el enlace de descarga directa en OneDrive y pégalo.
- Las imágenes en tu Excel deben ser URLs públicas (ya las pusiste en OneDrive). Si no, súbelas a la carpeta pública y pega sus URLs en la columna `Foto`.

--- public/index.html ---
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Margu Infantil - Catálogo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

--- src/main.jsx ---
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

--- src/App.jsx ---
import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'

// CONFIG: pega aquí tu enlace de OneDrive público (descarga directa si es posible)
const ONEDRIVE_FILE_URL = 'https://1drv.ms/x/c/6b44e352ee62b535/ETL_ieIQF7VGu58ySbUxvFABYXbW-mE48iOOy5ZVP6IFpA?e=cc2Gol'
const WA_NUMBER = '+523471049168'
const SHIPPING = 250

function cleanNumber(v){
  if(v === null || v === undefined) return 0
  if(typeof v === 'number') return v
  return Number(String(v).replace(/[^0-9.\-]/g,'') || 0)
}

function oneDriveToDownload(link){
  // intenta forzar descarga
  if(!link) return link
  if(link.includes('1drv.ms')){
    // append download param
    if(link.indexOf('?') === -1) return link + '?download=1'
    return link + '&download=1'
  }
  return link
}

export default function App(){
  const [rows, setRows] = useState([])
  const [grouped, setGrouped] = useState({})
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({color:'', talla:''})
  const [cliente, setCliente] = useState({nombre:'', tel:'', comentario:''})

  useEffect(()=>{
    loadXLSX()
  }, [])

  async function loadXLSX(){
    setLoading(true)
    try{
      const dl = oneDriveToDownload(ONEDRIVE_FILE_URL)
      const resp = await fetch(dl)
      if(!resp.ok) throw new Error('Error descargando archivo: ' + resp.status)
      const ab = await resp.arrayBuffer()
      const wb = XLSX.read(ab, {type:'array'})
      const sheetName = wb.SheetNames.find(s=>s.toLowerCase().includes('inventario')) || wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(ws, {defval: ''})
      const normalized = json.map(r=>({
        Serie: r['Serie']||r['serie']||'',
        Prenda: r['Prenda']||r['prenda']||'',
        Color: r['Color']||r['color']||'',
        Talla: String(r['Talla']||''),
        Edad: r['Edad']||'',
        Menudeo: cleanNumber(r['Menudeo']||0),
        Mayoreo: cleanNumber(r['Mayoreo']||0),
        Corrida: cleanNumber(r['Corrida']||0),
        Inventario: Number(r['Inventario']||0),
        Foto: r['Foto']||'',
        Qty: Number(r['Qty']||0),
        Corridas: Number(r['Corridas']||0)
      }))
      setRows(normalized)
      regroup(normalized)
    }catch(err){
      console.error(err)
      alert('Error cargando Excel: ' + err.message + '\nSi ves un error CORS, usa el enlace de descarga directa en OneDrive o sube el archivo al repo en Vercel.')
    }finally{setLoading(false)}
  }

  function regroup(data){
    const g = {}
    data.forEach(r=>{
      const key = r.Serie + '||' + r.Color
      if(!g[key]) g[key] = {serie:r.Serie, prenda:r.Prenda, color:r.Color, rows:[]}
      g[key].rows.push({...r})
    })
    // sort tallas
    Object.values(g).forEach(group=>group.rows.sort((a,b)=>a.Talla.localeCompare(b.Talla, undefined, {numeric:true})))
    setGrouped(g)
  }

  function updateQty(serie,color,talla,val){
    const data = rows.map(r=>{
      if(r.Serie===serie && r.Color===color && r.Talla===talla) return {...r, Qty: Number(val)||0}
      return r
    })
    setRows(data); regroup(data)
  }
  function updateCorr(serie,color,talla,val){
    const data = rows.map(r=>{
      if(r.Serie===serie && r.Color===color && r.Talla===talla) return {...r, Corridas: Number(val)||0}
      return r
    })
    setRows(data); regroup(data)
  }

  function applyFilter(){
    const color = filters.color.trim().toLowerCase()
    const talla = filters.talla.trim().toLowerCase()
    const filtered = rows.filter(r=>{
      if(color && !String(r.Color).toLowerCase().includes(color)) return false
      if(talla && !String(r.Talla).toLowerCase().includes(talla)) return false
      return true
    })
    regroup(filtered)
  }

  function computeTotals(){
    let subtotal = 0; let totalItems = 0
    Object.values(grouped).forEach(g=>{
      let totalGroupPieces = 0
      g.rows.forEach(r=> totalGroupPieces += (Number(r.Qty)||0) + (Number(r.Corridas)||0))
      const aplicaMay = totalGroupPieces > 12
      g.rows.forEach(r=>{
        const qty = Number(r.Qty)||0; const corrs = Number(r.Corridas)||0
        if(aplicaMay){ subtotal += (qty + corrs) * r.Mayoreo }
        else { subtotal += qty * r.Menudeo; subtotal += corrs * r.Corrida }
        totalItems += qty + corrs
      })
    })
    return {subtotal, totalItems, total: subtotal + SHIPPING}
  }

  function buildOrderText(){
    if(!cliente.nombre || !cliente.tel) { alert('Completa Nombre y Teléfono'); return null }
    let resumen = ''
    Object.values(grouped).forEach(g=>{
      let totalGroupPieces = 0
      g.rows.forEach(r=> totalGroupPieces += (Number(r.Qty)||0) + (Number(r.Corridas)||0))
      if(totalGroupPieces>0){
        resumen += `${g.serie} - ${g.prenda} (${g.color}): ${totalGroupPieces} piezas\n`
        g.rows.forEach(r=>{
          const qty = Number(r.Qty)||0; const corrs = Number(r.Corridas)||0
          if(qty>0 || corrs>0){ resumen += `  ${r.Talla} - Qty: ${qty} Corridas: ${corrs}\n` }
        })
      }
    })
    const totals = computeTotals()
    let msg = `Hola, hice este pedido:\nCliente: ${cliente.nombre}\nTel: ${cliente.tel}\n\nPedido:\n${resumen}\nSubtotal: $${totals.subtotal.toFixed(2)}\nEnvio: $${SHIPPING.toFixed(2)}\nTotal: $${totals.total.toFixed(2)}\n`
    if(cliente.comentario) msg += `Comentario: ${cliente.comentario}\n`
    return msg
  }

  function sendWhats(){
    const text = buildOrderText(); if(!text) return
    const enc = encodeURIComponent(text)
    const phone = WA_NUMBER.replace(/\+/g,'').replace(/\s/g,'')
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${enc}`
    window.open(url, '_blank')
  }

  const totals = computeTotals()

  return (
    <div style={{padding:20}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <h2>Margu Infantil — Catálogo</h2>
        {loading && <div style={{color:'#7b5e7b'}}>Cargando...</div>}
        <div style={{marginLeft:'auto'}}>Envío: <b>${SHIPPING}</b></div>
      </div>

      <div style={{marginTop:12,marginBottom:12,display:'flex',gap:10}}>
        <input placeholder="Filtrar color" value={filters.color} onChange={e=>setFilters({...filters,color:e.target.value})} />
        <input placeholder="Filtrar talla" value={filters.talla} onChange={e=>setFilters({...filters,talla:e.target.value})} />
        <button onClick={applyFilter}>Aplicar filtro</button>
        <button onClick={()=>{ setRows([]); setGrouped({})}}>Limpiar</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:16}}>
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            {Object.keys(grouped).length===0 && <div style={{padding:12,background:'#fff'}}>No hay productos con ese filtro.</div>}
            {Object.values(grouped).map(g=> (
              <div key={g.serie+g.color} style={{background:'#fff',padding:12,borderRadius:10}}>
                <div style={{display:'flex',gap:12}}>
                  <div style={{width:120,height:120,background:'#f2e8f7',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8}}>
                    {g.rows[0].Foto ? <img src={g.rows[0].Foto} alt={g.serie} style={{maxWidth:'100%',maxHeight:'100%'}} onClick={()=>window.open(g.rows[0].Foto,'_blank')} /> : <div>No image</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700}}>{g.prenda}</div>
                    <div style={{fontSize:13,color:'#6a4a6a'}}>Serie: {g.serie} • Color: {g.color}</div>
                    <div style={{marginTop:8}}>
                      {g.rows.map(r=> (
                        <div key={r.Talla} style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                          <div style={{width:80}}>{r.Talla} {r.Edad?('('+r.Edad+')'):''}</div>
                          <input type="number" min={0} value={r.Qty} onChange={e=>updateQty(g.serie,g.color,r.Talla,e.target.value)} style={{width:70}} />
                          <input type="number" min={0} value={r.Corridas} onChange={e=>updateCorr(g.serie,g.color,r.Talla,e.target.value)} style={{width:70}} />
                          <div style={{marginLeft:10,fontSize:12,color:'#4b2b4f'}}>M: ${r.Menudeo} C: ${r.Corrida} My: ${r.Mayoreo}</div>
                          <div style={{marginLeft:'auto',fontSize:12,color:'#7b597b'}}>Stock: {r.Inventario}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{position:'sticky',top:16}}>
          <div style={{background:'#fff',padding:12,borderRadius:10}}>
            <div style={{fontSize:13}}>Nombre</div>
            <input value={cliente.nombre} onChange={e=>setCliente({...cliente,nombre:e.target.value})} />
            <div style={{fontSize:13,marginTop:8}}>Teléfono</div>
            <input value={cliente.tel} onChange={e=>setCliente({...cliente,tel:e.target.value})} />
            <div style={{fontSize:13,marginTop:8}}>Comentario</div>
            <textarea value={cliente.comentario} onChange={e=>setCliente({...cliente,comentario:e.target.value})} />

            <div style={{marginTop:10}}>Artículos: <b>{totals.totalItems}</b></div>
            <div style={{fontWeight:700,fontSize:18}}>Subtotal: ${totals.subtotal.toFixed(2)}</div>
            <div>Envío: ${SHIPPING}</div>
            <div style={{fontWeight:700,fontSize:18}}>Total: ${totals.total.toFixed(2)}</div>

            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button onClick={sendWhats} style={{background:'#CDA4E8',color:'#fff',padding:'8px 10px',borderRadius:8}}>📩 Enviar pedido (WhatsApp)</button>
              <button onClick={()=>{ // guardar local JSON
                const order = {fecha:new Date().toISOString(),cliente,items:[]}
                Object.values(grouped).forEach(g=> g.rows.forEach(r=>{ if((r.Qty||0)>0 || (r.Corridas||0)>0) order.items.push({...r}) }))
                const blob = new Blob([JSON.stringify(order,null,2)],{type:'application/json'}); const a= document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pedido_'+Date.now()+'.json'; a.click(); URL.revokeObjectURL(a.href)
              }} style={{background:'#9b7bbc',color:'#fff',padding:'8px 10px',borderRadius:8}}>Guardar pedido</button>
            </div>

          </div>

        </div>
      </div>

    </div>
  )
}

--- src/styles.css ---
/* Opcional: añade aquí estilos personalizados (o copia el CSS del prototipo anterior) */
body{background:#F6EAF9;color:#4B2B4F;font-family:Inter,Segoe UI,Arial}
input,textarea{width:100%;padding:8px;border:1px solid #eee;border-radius:6px}

---

// FIN
