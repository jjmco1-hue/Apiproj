import { conmysql } from "../db.js";

export const pruebaPacientes = (req, res) => {
  res.send("Prueba con éxito - pacientes");
};

export const getPacientes = async (req, res) => {
  try {

    // Si es un médico, verificar su certificación
    if (req.user.rol_id === 2) {

      const [estado] = await conmysql.query(
        `
        SELECT estado
        FROM solicitudes_certificacion
        WHERE usuario_id = ?
        ORDER BY solicitud_id DESC
        LIMIT 1
        `,
        [req.user.usuario_id]
      );

      if (estado.length === 0) {
        return res.status(403).json({
          message: "No existe una solicitud de certificación."
        });
      }

      if (estado[0].estado !== "aprobada") {
        return res.status(403).json({
          message: "Su certificación médica aún no ha sido aprobada."
        });
      }

    }

    const [rows] = await conmysql.query(`
      SELECT
        u.usuario_id,
        u.nombre,
        u.correo,
        p.paciente_id,
        p.peso,
        p.estatura,
        p.edad
      FROM usuarios u
      INNER JOIN pacientes p
        ON p.usuario_id = u.usuario_id
      WHERE u.rol_id = 3
    `);

    res.json({
      cant: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("Error en getPacientes:", error);
    res.status(500).json({
      message: "Error en el servidor"
    });
  }
};
export const getPacientexId = async (req, res) => {
  try {
    const [rows] = await conmysql.query(`
      SELECT 
        u.usuario_id,
        u.nombre,
        u.correo,
        p.paciente_id,
        p.peso,
        p.estatura,
        p.edad
      FROM usuarios u
      INNER JOIN pacientes p ON p.usuario_id = u.usuario_id
      WHERE u.usuario_id = ? AND u.rol_id = 3
    `, [req.params.id]);

    if (rows.length === 0)
      return res.json({ cant: 0, message: "Paciente no encontrado" });

    res.json({
      cant: 1,
      data: rows[0]
    });

  } catch (error) {
    console.error("Error en getPacientexId:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const updatePerfilPaciente = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.usuario_id;
  const rol = req.user.rol_id;

  if (rol !== 1 && id !== userId) {
    return res.status(403).json({ message: "No autorizado" });
  }

  const { peso, estatura, edad } = req.body;

  try {
    await conmysql.query(
      `UPDATE pacientes SET peso=?, estatura=?, edad=? WHERE usuario_id=?`,
      [peso, estatura, edad, id]
    );

    res.json({ message: "Datos actualizados correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar" });
  }
};
export const crearPaciente = async (req, res) => {

  const conexion = await conmysql.getConnection();

  try {

    await conexion.beginTransaction();


    const {
      usuario,
      password,
      nombre,
      correo,
      peso,
      estatura,
      edad
    } = req.body;


    // Validación
    if (
      !usuario ||
      !password ||
      !nombre ||
      !correo ||
      !peso ||
      !estatura ||
      !edad
    ) {

      return res.status(400).json({
        message:"Complete todos los datos"
      });

    }


    // 1. Crear login
    const [login] = await conexion.query(
      `
      INSERT INTO login(usuario,password)
      VALUES (?,?)
      `,
      [
        usuario,
        password
      ]
    );


    const login_id = login.insertId;



    // 2. Crear usuario
    const [user] = await conexion.query(
      `
      INSERT INTO usuarios
      (
        login_id,
        rol_id,
        nombre,
        correo
      )
      VALUES (?,?,?,?)
      `,
      [
        login_id,
        3,
        nombre,
        correo
      ]
    );


    const usuario_id = user.insertId;



    // 3. Crear paciente
    await conexion.query(
      `
      INSERT INTO pacientes
      (
        usuario_id,
        peso,
        estatura,
        edad
      )
      VALUES (?,?,?,?)
      `,
      [
        usuario_id,
        peso,
        estatura,
        edad
      ]
    );



    await conexion.commit();


    res.json({
      message:"Paciente registrado correctamente",
      usuario_id
    });



  } catch(error){

    await conexion.rollback();

    console.error(error);


    res.status(500).json({
      message:error.message
    });


  } finally {

    conexion.release();

  }

};
export const deletePaciente = async (req, res) => {
  try {
    const usuarioId = req.params.id;

    const [[usuario]] = await conmysql.query(
      "SELECT login_id FROM usuarios WHERE usuario_id = ? AND rol_id = 3",
      [usuarioId]
    );

    if (!usuario)
      return res.status(404).json({ message: "Paciente no encontrado" });

    const loginId = usuario.login_id;

    await conmysql.query(
      "DELETE FROM pacientes WHERE usuario_id = ?",
      [usuarioId]
    );

    await conmysql.query(
      "DELETE FROM usuarios WHERE usuario_id = ?",
      [usuarioId]
    );

    if (loginId) {
      await conmysql.query(
        "DELETE FROM login WHERE login_id = ?",
        [loginId]
      );
    }

    res.json({ message: "Paciente eliminado correctamente (pacientes + usuarios + login)" });

  } catch (error) {
    console.error("Error en deletePaciente:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};