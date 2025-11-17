import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ------------------------------------------------
// Función para generar el archivo Excel
// ------------------------------------------------
async function generarExcel(pedido) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pedido");

  sheet.addRow([
    "Lote",
    "Serie",
    "CB",
    "Color",
    "Talla",
    "Cantidad",
    "Foto",
    "Precio",
  ]);

  pedido.forEach((p) => {
    sheet.addRow([
      p.lote,
      p.serie,
      p.cb,
      p.color,
      p.talla,
      p.cantidad,
      p.foto,
      p.precio,
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// ------------------------------------------------
// Limpiar nombre del archivo
// ------------------------------------------------
function limpiarNombre(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toLowerCase();
}

// ------------------------------------------------
// Handler principal
// ------------------------------------------------
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Solo POST permitido" });
    }

    const { cliente, pedido } = req.body;

    if (!cliente || !pedido) {
      return res.status(400).json({ ok: false, error: "Faltan datos" });
    }

    // Crear nombre limpio y fecha
    const hoy = new Date();
    const fecha = `${hoy.getDate()}-${hoy.getMonth() + 1}-${hoy.getFullYear()}`;
    const nombreLimpio = limpiarNombre(cliente);

    // Nombre final del archivo
    const fileName = `${fecha}_${nombreLimpio}.xlsx`;

    // Generar Excel
    const buffer = await generarExcel(pedido);

    // Subir archivo
    const { error } = await supabase.storage
      .from("pedidos")
      .upload(fileName, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (error) {
      console.log(error);
      return res
        .status(500)
        .json({ ok: false, error: "Error subiendo archivo" });
    }

    // Obtener URL pública de Supabase
    const { data } = supabase.storage
      .from("pedidos")
      .getPublicUrl(fileName);

    return res.status(200).json({
      ok: true,
      url: data.publicUrl,
      fileName,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Error interno" });
  }
}
