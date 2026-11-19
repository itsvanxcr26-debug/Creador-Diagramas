import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/ServidorFlujo")
public class ServidorFlujo extends HttpServlet {

    private void configurarCabeceras(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
        response.setContentType("text/plain; charset=UTF-8");
    }

    private File obtenerDirectorioBase() {
        String rutaReal = getServletContext().getRealPath("/");
        File dir;
        if (rutaReal != null) {
            dir = new File(rutaReal, "datos_servidor");
        } else {
            dir = new File(System.getProperty("user.home"), "datos_servidor_flujo");
        }
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir;
    }

    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        configurarCabeceras(response);
        response.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        configurarCabeceras(response);
        response.getWriter().print("SERVIDOR_ACTIVO");
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");
        configurarCabeceras(response);
        PrintWriter out = response.getWriter();

        String accion = request.getParameter("accion");
        if (accion == null) {
            out.print("Acción no especificada.");
            return;
        }

        switch (accion) {
            case "registro":
                registrarUsuario(request, out);
                break;
            case "login":
                autenticarUsuario(request, out);
                break;
            case "guardar":
                guardarDiagramaXML(request, out);
                break;
            case "listar":
                listarDiagramasUsuario(request, out);
                break;
            case "cargar":
                cargarDiagramaXML(request, out);
                break;
            default:
                out.print("Acción no válida.");
        }
    }

    private void registrarUsuario(HttpServletRequest request, PrintWriter out) throws IOException {
        String nombre = request.getParameter("nombre");
        String correo = request.getParameter("correo");
        String usuario = request.getParameter("usuario");
        String password = request.getParameter("password");

        File archivoUsuarios = new File(obtenerDirectorioBase(), "usuarios.txt");
        if (archivoUsuarios.exists()) {
            try (BufferedReader br = new BufferedReader(new FileReader(archivoUsuarios))) {
                String linea;
                while ((linea = br.readLine()) != null) {
                    String[] partes = linea.split("\\|");
                    if (partes.length >= 4) {
                        if (partes[1].equalsIgnoreCase(correo) || partes[2].equalsIgnoreCase(usuario)) {
                            out.print("El usuario o correo ya está registrado.");
                            return;
                        }
                    }
                }
            }
        }

        try (FileWriter fw = new FileWriter(archivoUsuarios, true)) {
            fw.write(nombre + "|" + correo + "|" + usuario + "|" + password + "\n");
        }

        out.print("OK:" + usuario);
    }

    private void autenticarUsuario(HttpServletRequest request, PrintWriter out) throws IOException {
        String identificador = request.getParameter("identificador");
        String password = request.getParameter("password");

        File archivoUsuarios = new File(obtenerDirectorioBase(), "usuarios.txt");
        if (!archivoUsuarios.exists()) {
            out.print("No hay usuarios registrados aún.");
            return;
        }

        try (BufferedReader br = new BufferedReader(new FileReader(archivoUsuarios))) {
            String linea;
            while ((linea = br.readLine()) != null) {
                String[] partes = linea.split("\\|");
                if (partes.length >= 4) {
                    boolean coincideId = partes[1].equalsIgnoreCase(identificador)
                            || partes[2].equalsIgnoreCase(identificador);
                    if (coincideId && partes[3].equals(password)) {
                        out.print("OK:" + partes[2]);
                        return;
                    }
                }
            }
        }

        out.print("Usuario/correo o contraseña incorrectos.");
    }

    private void guardarDiagramaXML(HttpServletRequest request, PrintWriter out) throws IOException {
        String usuario = sanitizarNombre(request.getParameter("usuario"));
        String nombreDiagrama = sanitizarNombre(request.getParameter("nombreDiagrama"));
        String xml = request.getParameter("xml");

        File dirUsuario = new File(obtenerDirectorioBase(), "diagramas" + File.separator + usuario);
        if (!dirUsuario.exists()) {
            dirUsuario.mkdirs();
        }

        File archivoXML = new File(dirUsuario, nombreDiagrama + ".xml");
        Files.write(archivoXML.toPath(), xml.getBytes(StandardCharsets.UTF_8));

        out.print("Diagrama guardado correctamente en XML: " + nombreDiagrama + ".xml");
    }

    private void listarDiagramasUsuario(HttpServletRequest request, PrintWriter out) {
        String usuario = sanitizarNombre(request.getParameter("usuario"));
        File dirUsuario = new File(obtenerDirectorioBase(), "diagramas" + File.separator + usuario);

        if (!dirUsuario.exists()) {
            out.print("");
            return;
        }

        File[] archivos = dirUsuario.listFiles((dir, name) -> name.endsWith(".xml"));
        if (archivos == null || archivos.length == 0) {
            out.print("");
            return;
        }

        List<String> nombres = new ArrayList<>();
        for (File f : archivos) {
            nombres.add(f.getName().replace(".xml", ""));
        }
        out.print(String.join(",", nombres));
    }

    private void cargarDiagramaXML(HttpServletRequest request, PrintWriter out) throws IOException {
        String usuario = sanitizarNombre(request.getParameter("usuario"));
        String nombreDiagrama = sanitizarNombre(request.getParameter("nombreDiagrama"));

        File archivoXML = new File(obtenerDirectorioBase(),
                "diagramas" + File.separator + usuario + File.separator + nombreDiagrama + ".xml");

        if (!archivoXML.exists()) {
            out.print("No se encontró el archivo XML solicitado.");
            return;
        }

        String contenido = new String(Files.readAllBytes(archivoXML.toPath()), StandardCharsets.UTF_8);
        out.print(contenido);
    }

    private String sanitizarNombre(String texto) {
        if (texto == null) return "default";
        return texto.replaceAll("[^a-zA-Z0-9_-]", "_");
    }
}