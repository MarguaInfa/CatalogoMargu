import ExcelJS from "exceljs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const { cliente, pedido } = req.body;

    if (!cliente || !pedido) {
      return res.status(400).json({ ok: false, error: "Faltan datos" });
    }

    // Crear workbook
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

    // Agregar items
    pedido.forEach((item) => {
      sheet.addRow([
        item.lote,
        item.serie,
        item.cb,
        item.color,
        item.talla,
        item.cantidad,
        item.foto,
        item.precio,
      ]);
    });

    // Nombre del archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${timestamp}_${cliente}.xlsx`;

    // Convertir a buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Enviar archivo en base64
    const base64 = buffer.toString("base64");

    return res.status(200).json({
      ok: true,
      fileName,
      fileBase64: base64,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
