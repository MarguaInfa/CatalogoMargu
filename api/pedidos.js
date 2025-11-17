import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Solo POST permitido" });
  }

  try {
    const { cliente, pedido } = req.body;

    if (!cliente || !pedido) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    // Conectar Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Crear workbook de Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Pedido");

    // Encabezados
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

    // Agregar filas
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

    // Convertir a buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Nombre del archivo
    const fileName = `${Date.now()}_${cliente}.xlsx`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from("pedidos")
      .upload(fileName, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error subiendo archivo" });
    }

    // Obtener URL pública
    const urlPublica = `${process.env.SUPABASE_URL}/storage/v1/object/public/pedidos/${fileName}`;

    return res.status(200).json({
      ok: true,
      url: urlPublica,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
