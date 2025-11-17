import React, { useState, useEffect } from "react";

export default function App() {

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzgLlsl-9154ktmsmSQVasE7IcsJ4HwTOsJhXWa82RhRtjs1-lMoPFsNPlzXqB1tn82aA/exec";

  const [productosData, setProductosData] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cliente, setCliente] = useState("");

  // FILTROS
  const [filtroGenero, setFiltroGenero] = useState("");
  const [filtroPrenda, setFiltroPrenda] = useState("");
  const [filtroColor, setFiltroColor] = useState("");
  const [filtroTalla, setFiltroTalla] = useState("");

  // =====================================================
  // Cargar productos.json
  useEffect(() => {
    fetch("/productos.json")
      .then((res) => res.json())
      .then((data) => setProductosData(data));
  }, []);

  // =====================================================
  // Agrupar productos por Serie + Color
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
            Foto: p.Foto,   // <--- solo el nombre de la imagen, ej: "IMG_001.jpg"
            Menudeo: p.Menudeo,
            Mayoreo: p.Mayoreo,
            Corrida: p.Corrida,
            corridas: 0,
            Tallas: []
          };
        }

        acc[key].Tallas.push({
          Talla: p.Talla,
          Edad: p.Edad,
          Inventario: p.Inventario,
          cantidad: 0
        });

        return acc;
      }, {})
    );

    setProductos(agrupados);
  }, [productosData]);

  // =====================================================
  // FILTROS
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
  const tallas = [...new Set(productos.flatMap((p) => p.Tallas.map((t) => t.Talla)))];

  // =====================================================
  // CALCULAR TOTAL
  const total = (() => {
    let totalPzas = 0;
    let totalDinero = 0;

    productos.forEach((p) => {
      const pzas = p.Tallas.reduce((s, t) => s + Number(t.cantidad || 0), 0);
      if (pzas === 0) return;

      let precio = p.Menudeo;
      if (pzas >= p.Tallas.filter((x) => x.Inventario > 0).length) precio = p.Corrida;

      totalPzas += pzas;
      totalDinero += pzas * precio;
    });

    return totalDinero;
  })();

  // =====================================================
  // GENERAR PEDIDO PARA EXCEL
  const generarPedidoParaExcel = () => {
    const pedidoFinal = [];
    let totalPiezas = 0;

    productos.forEach((p) => {
      p.Tallas.forEach((t) => (totalPiezas += Number(t.cantidad || 0)));
    });

    productos.forEach((p) => {
      const disponibles = p.Tallas.filter((t) => t.Inventario > 0).map((t) => t.Talla);
      const pedidas = p.Tallas.filter((t) => Number(t.cantidad) > 0);

      if (pedidas.length === 0) return;

      const esCorrida =
        pedidas.length === disponibles.length &&
        pedidas.every((t) => disponibles.includes(t.Talla));

      let precioFinal = p.Menudeo;
      if (totalPiezas > 12) precioFinal = p.Mayoreo;
      if (esCorrida) precioFinal = p.Corrida;

      pedidas.forEach((t) => {
        pedidoFinal.push({
          lote: p.Lote,
          serie: p.Serie,
          cb: p.CB,
          color: p.Color,
          talla: t.Talla,
          cantidad: Number(t.cantidad),
          foto: p.Foto,
          precio: precioFinal
        });
      });
    });

    return pedidoFinal;
  };

  // =====================================================
  // ENVIAR PEDIDO A GOOGLE + WHATSAPP
  const enviarPedido = async () => {
    if (!cliente) {
      alert("Escribe el nombre del cliente");
      return;
    }

    const pedido = generarPedidoParaExcel();

    let respuesta;
    try {
      respuesta = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "margu123", cliente, pedido })
      }).then((res) => res.json());
    } catch (err) {
      alert("Error enviando a Google Apps Script");
      return;
    }

    const urlExcel = respuesta.archivoUrl || "No generado";

    let totalPzas = 0;
    let totalDinero = 0;

    pedido.forEach((p) => {
      totalPzas += p.cantidad;
      totalDinero += p.cantidad * p.precio;
    });

    const mensaje = encodeURIComponent(
      `Hola! Soy ${cliente}.\n\n` +
      `Aquí está mi pedido:\n` +
      `🧵 Piezas: ${totalPzas}\n` +
      `💵 Total: $${totalDinero}\n\n` +
      `📄 Archivo Excel del pedido:\n${urlExcel}`
    );

    const telefono = "523471072670";
    const urlWhatsapp = `https://wa.me/${telefono}?text=${mensaje}`;
    window.open(urlWhatsapp, "_blank");

    alert("Pedido enviado. Se abrió WhatsApp con el mensaje listo.");
  };

  // =====================================================
  // UI
  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold text-center mb-6">
        Catálogo Margu Infantil
      </h1>

      {/* FILTROS */}
      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <select onChange={(e) => setFiltroGenero(e.target.value)} className="border p-2 rounded">
          <option value="">Todos los géneros</option>
          {generos.map((g) => <option key={g}>{g}</option>)}
        </select>

        <select onChange={(e) => setFiltroPrenda(e.target.value)} className="border p-2 rounded">
          <option value="">Todas las prendas</option>
          {prendas.map((p) => <option key={p}>{p}</option>)}
        </select>

        <select onChange={(e) => setFiltroColor(e.target.value)} className="border p-2 rounded">
          <option value="">Todos los colores</option>
          {colores.map((c) => <option key={c}>{c}</option>)}
        </select>

        <select onChange={(e) => setFiltroTalla(e.target.value)} className="border p-2 rounded">
          <option value="">Todas las tallas</option>
          {tallas.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtrados.map((p) => (
          <div key={p.Serie + p.Color} className="border p-3 bg-white rounded-xl shadow-md">

            {/* IMAGEN */}
            <div className="w-full aspect-square bg-gray-100 rounded overflow-hidden">
              <img
                src={`/fotos/${p.Foto}`}  // <--- RUTA CORRECTA PARA VERCEL
                className="w-full h-full object-cover"
                alt={p.Serie}
              />
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

            {/* TABLA */}
            <table className="w-full mt-3 text-center text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th>Talla</th>
                  <th>Men</th>
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
                    <td>${p.Menudeo}</td>
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
                    <td className={t.Inventario > 0 ? "text-green-600" : "text-red-600"}>
                      {t.Inventario > 0 ? "En stock" : "No hay"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        ))}
      </div>

      {/* TOTAL + CLIENTE */}
      <div className="text-center mt-10">
        <h2 className="text-xl font-bold">Total: ${total}</h2>

        <input
          type="text"
          placeholder="Nombre del cliente"
          className="border p-2 rounded mt-3 w-64"
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
