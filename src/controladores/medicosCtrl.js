import { conmysql } from "../db.js";
import cloudinary from "../cloudinary.js";

export const pruebaMedicos = (req, res) => {
  res.send("prueba con éxito - medicos");
};

export const getMedicos = async (req, res) => {
  try {
    const [result] = await conmysql.query(
      `SELECT m.*, u.nombre, u.correo 
       FROM medicos m
       INNER JOIN usuarios u ON u.usuario_id = m.usuario_id`
    );

    res.json({
      cant: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Error en getMedicos:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getMedicoxId = async (req, res) => {
  try {
    const [result] = await conmysql.query(
      `SELECT m.*, u.nombre, u.correo 
       FROM medicos m
       INNER JOIN usuarios u ON u.usuario_id = m.usuario_id
       WHERE m.medico_id = ?`,
      [req.params.id]
    );

    if (result.length <= 0)
      return res.json({ cant: 0, message: "Médico no encontrado" });

    res.json({
      cant: result.length,
      data: result[0],
    });
  } catch (error) {
    console.error("Error en getMedicoxId:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const postMedico = async (req, res) => {
  try {
    const {
      usuario_id,
      numero_licencia,
      especialidad,
      institucion,
      anios_experiencia,  
      certificado_por    
    } = req.body;

    let documento_certificacion = null;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "medicos_certificados",
            resource_type: "raw",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      documento_certificacion = uploadResult.secure_url;
    } else if (req.body.documento_certificacion) {
      documento_certificacion = req.body.documento_certificacion;
    }

    const [result] = await conmysql.query(
      `INSERT INTO medicos
       (usuario_id, numero_licencia, especialidad, institucion, anios_experiencia,
        documento_certificacion, certificado_por)
       VALUES (?,?,?,?,?,?,?)`,
      [
        usuario_id,
        numero_licencia,
        especialidad,
        institucion,
        anios_experiencia || null,
        documento_certificacion,
        certificado_por || null,
      ]
    );

    res.json({
      medico_id: result.insertId,
      documento_certificacion,
    });
  } catch (error) {
    console.error("Error en postMedico:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const putMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numero_licencia,
      especialidad,
      institucion,
      anios_experiencia,  
      certificado_por
    } = req.body;

    const [currentRows] = await conmysql.query(
      "SELECT documento_certificacion FROM medicos WHERE medico_id=?",
      [id]
    );

    if (currentRows.length === 0)
      return res.status(404).json({ message: "Médico no encontrado" });

    let documento_certificacion = currentRows[0].documento_certificacion;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "medicos_certificados",
            resource_type: "raw",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      documento_certificacion = uploadResult.secure_url;
    } else if (req.body.documento_certificacion) {
      documento_certificacion = req.body.documento_certificacion;
    }

    const [result] = await conmysql.query(
      `UPDATE medicos 
       SET numero_licencia=?,
           especialidad=?,
           institucion=?,
           anios_experiencia=?,
           documento_certificacion=?,
           certificado_por=?
       WHERE medico_id=?`,
      [
        numero_licencia,
        especialidad,
        institucion,
        anios_experiencia || null,
        documento_certificacion,
        certificado_por || null,
        id,
      ]
    );

    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Médico no encontrado" });

    const [fila] = await conmysql.query(
      "SELECT * FROM medicos WHERE medico_id=?",
      [id]
    );

    res.json(fila[0]);
  } catch (error) {
    console.error("Error en putMedico:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getPerfilMedico = async (req,res)=>{
  try{

    const usuario_id = req.user.usuario_id;

    const [result] = await conmysql.query(
      `
      SELECT
        u.usuario_id,
        u.nombre,
        u.correo,
        m.especialidad,
        m.numero_licencia,
        m.institucion,
        m.anios_experiencia,
        m.estado_certificacion
      FROM usuarios u
      INNER JOIN medicos m
        ON u.usuario_id = m.usuario_id
      WHERE u.usuario_id = ?
      `,
      [usuario_id]
    );


    if(result.length===0){
      return res.status(404).json({
        message:"Médico no encontrado"
      });
    }


    res.json(result[0]);


  }catch(error){

    console.error("Error perfil medico:",error);

    res.status(500).json({
      message:"Error del servidor"
    });

  }
};

export const deleteMedico = async (req, res) => {
  try {
    const { id } = req.params;

    const [[medicoData]] = await conmysql.query(
      "SELECT usuario_id FROM medicos WHERE medico_id = ?",
      [id]
    );

    if (!medicoData) {
      return res.status(404).json({ message: "Médico no encontrado" });
    }

    const usuario_id = medicoData.usuario_id;

    const [[usuarioData]] = await conmysql.query(
      "SELECT login_id FROM usuarios WHERE usuario_id = ?",
      [usuario_id]
    );

    const login_id = usuarioData?.login_id;

    await conmysql.query(
      "DELETE FROM medicos WHERE medico_id = ?",
      [id]
    );

    await conmysql.query(
      "DELETE FROM usuarios WHERE usuario_id = ?",
      [usuario_id]
    );

    if (login_id) {
      await conmysql.query(
        "DELETE FROM login WHERE login_id = ?",
        [login_id]
      );
    }

    return res.json({
      message: "Médico eliminado correctamente (medico + usuario + login)"
    });

} catch (error) {

  console.error("========== ERROR DELETE ==========");
  console.error(error);
  console.error("Mensaje:", error.message);
  console.error("SQL:", error.sqlMessage);
  console.error("Código:", error.code);

  return res.status(500).json({
    message: error.message,
    sql: error.sqlMessage,
    code: error.code
  });

}
};
