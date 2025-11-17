export default async function handler(req, res) {
  try {
    const { cliente, pedido } = req.body;

    const fileName = `${Date.now()}_${cliente}.xlsx`;

    // crear buffer Excel aquí...
    const buffer = await generarExcel(pedido);

    // Subir archivo
    const { error } = await supabase.storage
      .from("pedidos")
      .upload(fileName, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (error) {
      console.log(error);
      return res.status(500).json({ ok: false, error: "Error subiendo archivo" });
    }

    // Obtener URL pública correcta
    const { data } = supabase
      .storage
      .from("pedidos")
      .getPublicUrl(fileName);

    const urlPublica = data.publicUrl;

    return res.status(200).json({
      ok: true,
      url: urlPublica,
      fileName,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Error interno" });
  }
}
