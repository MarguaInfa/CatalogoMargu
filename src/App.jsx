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

  const ENVIO = 250;

  // ==========================================================
  // CARGAR productos.json
  // ==========================================================
  useEffect(() => {
    fetch("/productos.json")
      .then((res) => res.json())
      .then((data) => setProductosData(data));
  }, []);
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
  // TABLA DE PRECIOS POR RANGOS
  // ==========================================================
  function generarTablaPrecios(p) {
    const precios = p.Tallas.map((t) => ({
      talla: Number(t.Talla),
      mayoreo: p.Mayoreo,
      corrida: p.Corrida,
    })).sort((a, b) => a.talla - b.talla);

    return [
      {
        rango: `${precios[0].talla} - ${
          precios[precios.length - 1].talla
        }`,
        mayoreo: precios[0].mayoreo,
        corrida: precios[0].corrida,
      },
    ];
  }

  // ==========================================================
  // GENERAR PEDIDO (CORRIDA / MAYOREO GLOBAL)
  // ==========================================================
  const generarPedidoParaExcel = () => {
    const pedidoFinal = [];

    let totalPiezas = 0;
    productos.forEach((p) =>
      p.Tallas.forEach((t) => (totalPiezas += Number(t.cantidad || 0)))
    );

    productos.forEach((p) => {
      const pedidas = p.Tallas.filter((t) => Number(t.cantidad) > 0);
      if (pedidas.length === 0) return;

      const disponibles = p.Tallas.filter((t) => t.Inventario > 0);

      const esCorridaReal = disponibles.every(
        (t) => Number(t.cantidad || 0) >= 1
      );

      let precioFinal = esCorridaReal ? p.Corrida : p.Mayoreo;

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
  // SUBTOTAL, ENVÍO Y TOTAL
  // ==========================================================
  const subtotal = (() => {
    const pedido = generarPedidoParaExcel();
    return pedido.reduce((sum, x) => sum + x.cantidad * x.precio, 0);
  })();

  const total = subtotal + ENVIO;

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
        alert("Error generando archivo");
        return;
      }

      const mensaje = encodeURIComponent(
        `Pedido nuevo de ${cliente}\n\n` +
          `Subtotal: $${subtotal}\n` +
          `Envío: $${ENVIO}\n` +
          `Total: $${total}\n\n` +
          `Archivo: ${data.url}`
      );

      const tel = "523471072670";
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
      <div className="flex items-center mb-6">
        <img src="/logo.png.jpg" className="w-20 h-auto" />
      </div>

      <h1 className="text-3xl font-bold text-center mb-6">
        Catálogo Margu Infantil
      </h1>

      {/* FILTROS */}
      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <select className="border p-2 rounded" onChange={(e) => setFiltroGenero(e.target.value)}>
          <option value="">Género</option>
          {generos.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <select className="border p-2 rounded" onChange={(e) => setFiltroPrenda(e.target.value)}>
          <option value="">Prenda</option>
          {prendas.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <select className="border p-2 rounded" onChange={(e) => setFiltroColor(e.target.value)}>
          <option value="">Color</option>
          {colores.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select className="border p-2 rounded" onChange={(e) => setFiltroTalla(e.target.value)}>
          <option value="">Talla</option>
          {tallas.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {filtrados.map((p) => {
          const tabla = generarTablaPrecios(p);

          return (
            <div key={p.Serie + p.Color} className="border p-3 bg-white rounded-xl shadow-md">

              <img src={`/fotos/${p.Foto}`} className="w-full aspect-square object-cover rounded-md" />

              <h2 className="font-bold mt-2">{p.Serie}</h2>
              <p className="text-gray-600">{p.Color}</p>

{/* TABLA DE PRECIOS */}
<div className="overflow-x-auto mt-3">
  <table className="min-w-full text-sm text-center border">
    <thead className="bg-gray-200">
      <tr>
        <th className="px-2 py-1 whitespace-nowrap">Rango</th>
        <th className="px-2 py-1 whitespace-nowrap">Mayoreo</th>
        <th className="px-2 py-1 whitespace-nowrap">Corrida</th>
      </tr>
    </thead>

    <tbody>
      {tabla.map((row, i) => (
        <tr key={i}>
          <td className="px-2 py-1">{row.rango}</td>
          <td className="px-2 py-1">${row.mayoreo}</td>
          <td className="px-2 py-1">${row.corrida}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>



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

                    const prod = nuevo.find(
                      (x) => x.Serie === p.Serie && x.Color === p.Color
                    );

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

              {/* TABLA DE PEDIDO */}
              <table className="w-full mt-3 text-center text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th>Talla</th>
                     <th>Cant</th>
                    <th>Stock</th>
                  </tr>
                </thead>

                <tbody>
                  {p.Tallas.map((t, i) => (
                    <tr key={i}>
                      <td>{t.Talla}</td>
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
                        className={
                          t.Inventario > 0
                            ? "text-green-600 font-bold text-lg"
                            : "text-red-600 font-bold text-lg"
                        }
                      >
                        {t.Inventario > 0 ? "✔" : "✘"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* SUBTOTAL / ENVÍO / TOTAL */}
      <div className="text-center mt-10">
        <h2 className="text-xl font-bold">Subtotal: ${subtotal}</h2>
        <h2 className="text-xl font-bold">Envío: ${ENVIO}</h2>
        <h2 className="text-2xl font-bold mt-2">TOTAL: ${total}</h2>

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