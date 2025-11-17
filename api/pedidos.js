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

    // Cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Crear Excel
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

    const fileName = `${Date.now()}_${cliente}.xlsx`;

    // Subir archivo al bucket "pedidos"
    const { error } = await supabase.storage
      .from("pedidos")
      .upload(fileName, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Error subiendo archivo" });
    }

    // Construir URL pública correcta
    const urlPublica =
  `${process.env.SUPABASE_PROJECT_URL}` +
  `/storage/v1/object/public/pedidos/${fileName}`;


    return res.status(200).json({
      ok: true,
      url: urlPublica,
      fileName,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
