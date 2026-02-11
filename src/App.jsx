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

  // ✅ NUEVO: carga por bloques
  const [limite, setLimite] = useState(40);

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

        const displayTalla = `${p.Talla} ${p.Edad}`.trim();
        const claveTalla = `${p.Talla}-${p.Edad}`.trim();

        acc[key].Tallas.push({
          Talla: displayTalla, // "10 Años"
          TallaClave: claveTalla, // "10-Años"
          Edad: p.Edad,
          TallaNumero: Number(p.Talla),
          Inventario: Number(p.Inventario),
          Precio: Number(p.Mayoreo), // PRECIO REAL POR TALLA
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

  // ✅ NUEVO: cuando cambian filtros, vuelve a mostrar solo 40
  useEffect(() => {
    setLimite(40);
  }, [filtroGenero, filtroPrenda, filtroColor, filtroTalla]);

  // ==========================================================
  // TABLA DE PRECIOS POR RANGOS DE PRECIO (FIX ORDEN)
  // ==========================================================
  function generarTablaPrecios(p) {
    const precios = p.Tallas
      .map((t) => ({
        tallaTexto: t.Talla,
        tallaNumero: Number(t.TallaNumero),
        precio: Number(t.Precio),
      }))
      .sort((a, b) => a.tallaNumero - b.tallaNumero);

    const grupos = {};
    precios.forEach((x) => {
      const key = String(x.precio);
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(x);
    });

    const rangos = Object.entries(grupos).map(([precio, arr]) => {
      arr.sort((a, b) => a.tallaNumero - b.tallaNumero);
      return {
        rango: `${arr[0].tallaTexto} - ${arr[arr.length - 1].tallaTexto}`,
        precio,
      };
    });

    rangos.sort((a, b) => {
      const aIni = parseInt(a.rango.split(" - ")[0], 10);
      const bIni = parseInt(b.rango.split(" - ")[0], 10);
      return aIni - bIni;
    });

    return rangos;
  }

  // ==========================================================
  // GENERAR PEDIDO (PRECIO REAL POR TALLA)
  // ==========================================================
  const generarPedidoParaExcel = () => {
    const pedidoFinal = [];

    productos.forEach((p) => {
      const pedidas = p.Tallas.filter((t) => Number(t.cantidad) > 0);
      if (pedidas.length === 0) return;

      pedidas.forEach((t) => {
        pedidoFinal.push({
          lote: p.Lote,
          serie: p.Serie,
          cb: p.CB,
          color: p.Color,
          talla: t.Talla,
          cantidad: Number(t.cantidad),
          foto: p.Foto,
          precio: t.Precio,
        });
      });
    });

    return pedidoFinal;
  };

  // ==========================================================
  // SUBTOTAL / TOTAL
  // ==========================================================
  const subtotal = (() => {
    const pedido = generarPedidoParaExcel();
    return pedido.reduce(
      (sum, x) => sum + Number(x.cantidad) * Number(x.precio),
      0
    );
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
      <div className="flex items-center mb-6">
        <img src="/logo.png.jpg" className="w-20 h-auto" alt="Margu" />
      </div>

      <h1 className="text-3xl font-bold text-center mb-6">
        Catálogo Margu Infantil
      </h1>

      {/* FILTROS */}
      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <select
          className="border p-2 rounded"
          value={filtroGenero}
          onChange={(e) => setFiltroGenero(e.target.value)}
        >
          <option value="">Género</option>
          {generos.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={filtroPrenda}
          onChange={(e) => setFiltroPrenda(e.target.value)}
        >
          <option value="">Prenda</option>
          {prendas.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={filtroColor}
          onChange={(e) => setFiltroColor(e.target.value)}
        >
          <option value="">Color</option>
          {colores.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={filtroTalla}
          onChange={(e) => setFiltroTalla(e.target.value)}
        >
          <option value="">Talla</option>
          {tallas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {filtrados.slice(0, limite).map((p, index) => {
          const tabla = generarTablaPrecios(p);

          return (
            <div
              key={p.Serie + p.Color}
              className="border p-3 bg-white rounded-xl shadow-md"
            >
              <img
                src={`/fotos/Comp/${p.Foto}`}
                alt={`${p.Serie} ${p.Color}`}
                loading={index < 8 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "auto"}
                decoding="async"
                width="800"
                height="800"
                className="w-full aspect-square object-cover rounded-md"
              />

              <h2 className="font-bold mt-2">{p.Serie}</h2>
              <p className="text-gray-600">{p.Color}</p>

              {/* TABLA DE PRECIOS POR RANGOS */}
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full text-sm text-center border">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-2 py-1 whitespace-nowrap">Rango</th>
                      <th className="px-2 py-1 whitespace-nowrap">Mayoreo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabla.map((row, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1">{row.rango}</td>
                        <td className="px-2 py-1">${row.precio}</td>
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

      {/* BOTÓN CARGAR MÁS */}
      {limite < filtrados.length && (
        <div className="text-center mt-6">
          <button
            onClick={() => setLimite((x) => x + 40)}
            className="bg-gray-800 text-white px-6 py-2 rounded"
          >
            Cargar más ({Math.min(limite, filtrados.length)}/{filtrados.length})
          </button>
        </div>
      )}

      {/* SUBTOTAL / TOTAL */}
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
