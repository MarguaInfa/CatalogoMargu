import React, { useState, useEffect } from "react";

export default function App() {
  const API_PEDIDOS = "/api/pedidos";

  const [productosData, setProductosData] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cliente, setCliente] = useState("");

  const [filtroGenero, setFiltroGenero] = useState("");
  const [filtroPrenda, setFiltroPrenda] = useState("");
  const [filtroColor, setFiltroColor] = useState("");
  const [filtroTalla, setFiltroTalla] = useState("");

  // ==========================================================
  // CARGAR productos.json
  // ==========================================================
  useEffect(() => {
    fetch("/productos.json")
      .then((res) => res.json())
      .then((data) => setProductosData(data));
  }, []);

  // ============================================
// AGRUPAR RANGOS DE TALLAS POR PRECIO
// ============================================
function generarTablaPrecios(tallas) {
  // Convertimos a [{ talla: N, precio: N }]
  const datos = tallas.map((t) => ({
    talla: Number(t.Talla),
    precio: Number(t.precio || t.Precio || t.price || t.Menudeo || 0)
  }));

  // Ordenamos por talla
  const ordenadas = datos.sort((a, b) => a.talla - b.talla);

  const grupos = [];
  let inicio = ordenadas[0];
  let fin = ordenadas[0];

  for (let i = 1; i < ordenadas.length; i++) {
    const actual = ordenadas[i];

    if (
      actual.talla === fin.talla + 1 &&
      actual.precio === fin.precio
    ) {
      fin = actual;
    } else {
      grupos.push({ inicio, fin });
      inicio = actual;
      fin = actual;
    }
  }

  grupos.push({ inicio, fin });

  // Si todos los precios son iguales
  const preciosUnicos = new Set(ordenadas.map((x) => x.precio));
  if (preciosUnicos.size === 1) {
    return [
      { rango: "Todas las tallas", precio: ordenadas[0].precio }
    ];
  }

  return grupos.map((g) => ({
    rango:
      g.inicio.talla === g.fin.talla
        ? `Talla ${g.inicio.talla}`
        : `Talla ${g.inicio.talla}–${g.fin.talla}`,
    precio: g.inicio.precio
  }));
}

// ==========================================================
  // AGRUPAR PRODUCTOS POR Serie + Color
  // ==========================================================
  useEffect(() => {
    if (productosData.length === 0) return;

    const agrupados = Object.values(
      productosData.reduce((acc, p) => {
        const key = `${p.Serie}-${p.Color}`;

        if (!acc[key]) {
          acc[key] = {
            Genero: p.Genero,
            Lote: p.Lote,
            Serie: p.Serie,
            Prenda: p.Prenda,
            Color: p.Color,
            CB: p.CB,
            Foto: p.Foto,
            Mayoreo: p.Mayoreo,
            Corrida: p.Corrida,
            corridas: 0,
            Tallas: [],
          };
        }
 acc[key].Tallas.push({
          Talla: p.Talla,
          Edad: p.Edad,
          Inventario: p.Inventario,
          cantidad: 0,
        });

        return acc;
      }, {})
    );

    setProductos(agrupados);
  }, [productosData]);

  // ==========================================================
  // FILTROS
  // ==========================================================
  const filtrados = productos.filter((p) => {
    return (
      (!filtroGenero || p.Genero === filtroGenero) &&
      (!filtroPrenda || p.Prenda === filtroPrenda) &&
      (!filtroColor || p.Color === filtroColor) &&
      (!filtroTalla || p.Tallas.some((t) => t.Talla === filtroTalla))
    );
  });

  const generos = [...new Set(productos.map((p) => p.Genero))];
  const prendas = [...new Set(productos.map((p) => p.Prenda))];
  const colores = [...new Set(productos.map((p) => p.Color))];
  const tallas = [
    ...new Set(productos.flatMap((p) => p.Tallas.map((t) => t.Talla))),
  ];

// ==========================================================
// GENERAR PEDIDO (CORRIDA / MAYOREO GLOBAL)
// ==========================================================
const generarPedidoParaExcel = () => {
  const pedidoFinal = [];

  // Total global
  let totalPiezas = 0;
  productos.forEach((p) =>
    p.Tallas.forEach((t) => (totalPiezas += Number(t.cantidad || 0)))
  );

  productos.forEach((p) => {
    const pedidas = p.Tallas.filter((t) => Number(t.cantidad) > 0);
    if (pedidas.length === 0) return;

    const disponibles = p.Tallas.filter((t) => t.Inventario > 0);

    // CORRIDA REAL = TODAS LAS TALLAS DISPONIBLES TIENEN AL MENOS 1
    const esCorridaReal = disponibles.every(
      (t) => Number(t.cantidad || 0) >= 1
    );

    let precioFinal;

    if (esCorridaReal) {
      precioFinal = p.Corrida;
    } else {
      // SIN MENDEDEO — SOLO MAYOREO SIEMPRE
      precioFinal = p.Mayoreo;
    }

    pedidas.forEach((t) => {
      pedidoFinal.push({
        lote: p.Lote,
        serie: p.Serie,
        cb: p.CB,
        color: p.Color,
        talla: t.Talla,
        cantidad: Number(t.cantidad || 0),
        foto: p.Foto,
        precio: precioFinal,
      });
    });
  });

  return pedidoFinal;
};


  // ==========================================================
  // TOTAL MOSTRADO EN PANTALLA
  // ==========================================================
  const total = (() => {
    const pedido = generarPedidoParaExcel();
    return pedido.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  })();

  const envio = 250;
const subtotal = total;
const totalFinal = subtotal + envio;

// ==========================================================
  // ENVIAR PEDIDO
  // ==========================================================
  const enviarPedido = async () => {
    if (!cliente.trim()) {
      alert("Escribe el nombre del cliente");
      return;
    }

    const pedido = generarPedidoParaExcel();

    try {
      const r = await fetch(API_PEDIDOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente, pedido }),
      });

      const data = await r.json();

      if (!data.ok) {
        alert("Error generando archivo: " + data.error);
        return;
      }

      let totalPzas = 0;
      let totalDinero = 0;

      pedido.forEach((x) => {
        totalPzas += x.cantidad;
        totalDinero += x.cantidad * x.precio;
      });

const mensaje = encodeURIComponent(
  `Pedido nuevo de ${cliente}\n\n` +
    `Piezas: ${totalPzas}\n` +
    `Subtotal: $${totalDinero}\n` +
    `Envío: $250\n` +
    `Total: $${totalDinero + 250}\n\n` +
    `Archivo:\n${data.url}`
);


      const tel = "523471049168";
      window.open(`https://wa.me/${tel}?text=${mensaje}`, "_blank");

      alert("Pedido enviado ✔");
    } catch (err) {
      console.error(err);
      alert("Error enviando pedido");
    }
  };

    // ==========================================================
  // UI
  // ==========================================================
return (
  <div className="p-6">

    {/* LOGO SUPERIOR IZQUIERDO */}
    <div className="flex justify-start items-center mb-6">
      <img 
        src="/logo.png.jpg" 
        alt="Logo Margu" 
        className="w-20 h-auto"
      />
    </div>

    <h1 className="text-3xl font-bold text-center mb-6">
      Catálogo Infantiles Margua
    </h1>


      {/* FILTROS */}
      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <select
          className="border p-2 rounded"
          onChange={(e) => setFiltroGenero(e.target.value)}
        >
          <option value="">Género</option>
          {generos.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          onChange={(e) => setFiltroPrenda(e.target.value)}
        >
          <option value="">Prenda</option>
          {prendas.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          onChange={(e) => setFiltroColor(e.target.value)}
        >
          <option value="">Color</option>
          {colores.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          onChange={(e) => setFiltroTalla(e.target.value)}
        >
          <option value="">Talla</option>
          {tallas.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
{/* LISTA DE PRODUCTOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {filtrados.map((p) => (
          <div
            key={p.Serie + p.Color}
            className="border p-3 bg-white rounded-xl shadow-md"
          >
            <img
              src={`/fotos/${p.Foto}`}
              className="w-full aspect-square object-cover rounded-md"
            />

            {/* TABLA DE RANGOS DE PRECIOS */}
<div className="mt-3">
  <h3 className="text-sm font-semibold mb-1 text-gray-700">
    Precios por talla
  </h3>

  <table className="w-full text-sm border border-gray-300 rounded-lg overflow-hidden">
    <thead className="bg-gray-100">
      <tr>
        <th className="p-2 border border-gray-300">Rango</th>
        <th className="p-2 border border-gray-300">Precio</th>
      </tr>
    </thead>

    <tbody>
      {generarTablaPrecios(
        p.Tallas.map((t) => ({
          Talla: t.Talla,
          precio: p.Menudeo // ← puedes cambiar a Mayoreo o Corrida si quieres
        }))
      ).map((fila, idx) => (
        <tr key={idx}>
          <td className="p-2 border border-gray-300">{fila.rango}</td>
          <td className="p-2 border border-gray-300 font-bold">
            ${fila.precio}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


            <h2 className="font-bold mt-2">{p.Serie}</h2>
            <p className="text-gray-600">{p.Color}</p>
          {/* CORRIDAS */}
            <div className="mt-2">
              <label>Corridas: </label>
              <input
                type="number"
                min="0"
                className="border p-1 text-center w-16"
                value={p.corridas || ""}
                onChange={(e) => {
                  const valor = Number(e.target.value);
                  const nuevo = [...productos];
                  const prod = nuevo.find((x) => x.Serie === p.Serie && x.Color === p.Color);

                  prod.corridas = valor;

                  if (valor === 0) {
                    prod.Tallas.forEach((t) => (t.cantidad = 0));
                  } else {
                    prod.Tallas.forEach((t) => {
                      t.cantidad = t.Inventario > 0 ? valor : 0;
                    });
                  }

      setProductos(nuevo);
                }}
              />
            </div>
           <table className="w-full mt-3 text-center text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th>Talla</th>
                  <th>May</th>
                  <th>Cor</th>
                  <th>Cant</th>
                  <th>Stock</th>
                </tr>
              </thead>

              <tbody>
                {p.Tallas.map((t, i) => (
                  <tr key={i}>
                    <td>{t.Talla}</td>
                    <td>${p.Mayoreo}</td>
                    <td>${p.Corrida}</td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        className="w-12 border rounded text-center"
                        disabled={t.Inventario === 0}
                        value={t.cantidad}
                        onChange={(e) => {
                          const nuevo = [...productos];
                          const prod = nuevo.find(
                            (x) => x.Serie === p.Serie && x.Color === p.Color
                          );

                          prod.Tallas[i].cantidad = Number(e.target.value);
                          setProductos(nuevo);
                        }}
                      />
                    </td>

                    <td
                      className={t.Inventario > 0 ? "text-green-600" : "text-red-600"}
                    >
                      {t.Inventario > 0 ? "" " : "No hay"}
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
                     </div>
        ))}
      </div>

      {/* TOTAL & ENVIAR */}
<div className="text-center mt-10">
  <h2 className="text-2xl font-bold mb-2">Resumen del pedido</h2>

  <p className="text-lg">Subtotal: <b>${subtotal}</b></p>
  <p className="text-lg">Envío: <b>${envio}</b></p>

  <h2 className="text-2xl font-bold mt-2">
    Total: ${totalFinal}
  </h2>

  <input
    type="text"
    className="border p-2 rounded mt-3 w-64"
    placeholder="Nombre del cliente"
    value={cliente}
    onChange={(e) => setCliente(e.target.value)}
  />

  <button
    onClick={enviarPedido}
    className="block mx-auto mt-4 bg-green-600 text-white px-6 py-2 rounded"
  >
    Enviar pedido
  </button>
</div>

  </div>
  );
}

