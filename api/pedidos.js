import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Generar Excel (ya corregido)
async function generarExcel(pedido) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pedido");

  sheet.addRow(["Talla", "Cantidad", "Precio"]);

  pedido.forEach((p) => {
    sheet.addRow([p.talla, p.cantidad, p.precio]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export default async function handler(req, res) {
  try {
    const { cliente, pedido } = req.body;

    const fileName = `${Date.now()}_${cliente}.xlsx`;

    // Generar Excel correcto
    const buffer = await generarExcel(pedido);

    // Subir archivo a Supabase
    const { error } = await supabase.storage
      .from("pedidos")
      .upload(fileName, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (error) {
      console.log(error);
      return res.status(500).json({ ok: false, error: "Error subiendo archivo" });
    }

    // Obtener URL pública del archivo
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
