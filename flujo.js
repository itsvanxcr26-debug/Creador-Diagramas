document.addEventListener("DOMContentLoaded", () => {
    const URL_SERVIDOR = resolverRutaServidor();
    let usuarioActual = null;
    let nodos = [];
    let nodoSeleccionadoId = null;
    let contadorId = 1;

    function resolverRutaServidor() {
        if (window.location.protocol === "file:") {
            return "http://localhost:8080/EditorDiagramas/ServidorFlujo";
        }
        const path = window.location.pathname;
        const base = path.substring(0, path.lastIndexOf("/") + 1);
        return window.location.origin + base + "ServidorFlujo";
    }

    const pantallaAuth = document.getElementById("pantalla-auth");
    const tabLogin = document.getElementById("tab-login");
    const tabRegistro = document.getElementById("tab-registro");
    const formLogin = document.getElementById("form-login");
    const formRegistro = document.getElementById("form-registro");
    const mensajeAuth = document.getElementById("mensaje-auth");
    const badgeUsuario = document.getElementById("usuario-activo-badge");

    const lienzo = document.getElementById("lienzo");
    const svgCanvas = document.getElementById("svg-canvas");
    const codigoCPre = document.getElementById("codigo-c");

    const inputContorno = document.getElementById("color-contorno");
    const inputRelleno = document.getElementById("color-relleno");
    const inputTamanoLetra = document.getElementById("tamano-letra");
    const btnEliminar = document.getElementById("btn-eliminar");
    const btnGuardar = document.getElementById("btn-guardar");
    const btnCargar = document.getElementById("btn-cargar");
    const inputNombreDiagrama = document.getElementById("nombre-diagrama");
    const selectDiagramas = document.getElementById("lista-diagramas");

    tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("activa");
        tabRegistro.classList.remove("activa");
        formLogin.style.display = "block";
        formRegistro.style.display = "none";
        mensajeAuth.textContent = "";
    });

    tabRegistro.addEventListener("click", () => {
        tabRegistro.classList.add("activa");
        tabLogin.classList.remove("activa");
        formRegistro.style.display = "block";
        formLogin.style.display = "none";
        mensajeAuth.textContent = "";
    });

    function obtenerUsuariosLocales() {
        try {
            return JSON.parse(localStorage.getItem("flujo_usuarios_v1") || "[]");
        } catch (e) {
            return [];
        }
    }

    function guardarUsuariosLocales(lista) {
        localStorage.setItem("flujo_usuarios_v1", JSON.stringify(lista));
    }

    function obtenerDiagramasLocales(usuario) {
        try {
            return JSON.parse(localStorage.getItem("flujo_xml_" + usuario) || "{}");
        } catch (e) {
            return {};
        }
    }

    function guardarDiagramasLocales(usuario, mapa) {
        localStorage.setItem("flujo_xml_" + usuario, JSON.stringify(mapa));
    }

    function procesarLocal(params) {
        const accion = params.get("accion");
        if (accion === "registro") {
            const nombre = params.get("nombre") || "";
            const correo = params.get("correo") || "";
            const usuario = params.get("usuario") || "";
            const password = params.get("password") || "";
            const usuarios = obtenerUsuariosLocales();
            const existe = usuarios.some(u =>
                u.correo.toLowerCase() === correo.toLowerCase() ||
                u.usuario.toLowerCase() === usuario.toLowerCase()
            );
            if (existe) {
                return "El usuario o correo ya está registrado.";
            }
            usuarios.push({ nombre, correo, usuario, password });
            guardarUsuariosLocales(usuarios);
            return "OK:" + usuario;
        }

        if (accion === "login") {
            const identificador = params.get("identificador") || "";
            const password = params.get("password") || "";
            const usuarios = obtenerUsuariosLocales();
            const encontrado = usuarios.find(u =>
                (u.correo.toLowerCase() === identificador.toLowerCase() ||
                 u.usuario.toLowerCase() === identificador.toLowerCase()) &&
                u.password === password
            );
            if (encontrado) {
                return "OK:" + encontrado.usuario;
            }
            return "Usuario/correo o contraseña incorrectos.";
        }

        if (accion === "guardar") {
            const usuario = params.get("usuario") || "invitado";
            const nombreDiagrama = params.get("nombreDiagrama") || "diagrama";
            const xml = params.get("xml") || "";
            const mapa = obtenerDiagramasLocales(usuario);
            mapa[nombreDiagrama] = xml;
            guardarDiagramasLocales(usuario, mapa);
            return "Diagrama guardado correctamente en XML: " + nombreDiagrama + ".xml";
        }

        if (accion === "listar") {
            const usuario = params.get("usuario") || "invitado";
            const mapa = obtenerDiagramasLocales(usuario);
            return Object.keys(mapa).join(",");
        }

        if (accion === "cargar") {
            const usuario = params.get("usuario") || "invitado";
            const nombreDiagrama = params.get("nombreDiagrama") || "";
            const mapa = obtenerDiagramasLocales(usuario);
            if (mapa[nombreDiagrama]) {
                return mapa[nombreDiagrama];
            }
            return "No se encontró el archivo XML solicitado.";
        }

        return "";
    }

    async function enviarPeticionServidor(datos) {
        try {
            const resp = await fetch(URL_SERVIDOR, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
                },
                body: datos.toString()
            });
            if (!resp.ok) {
                return procesarLocal(datos);
            }
            return await resp.text();
        } catch (err) {
            return procesarLocal(datos);
        }
    }

    formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();
        const datos = new URLSearchParams();
        datos.append("accion", "registro");
        datos.append("nombre", document.getElementById("reg-nombre").value.trim());
        datos.append("correo", document.getElementById("reg-correo").value.trim());
        datos.append("usuario", document.getElementById("reg-usuario").value.trim());
        datos.append("password", document.getElementById("reg-password").value.trim());

        const texto = await enviarPeticionServidor(datos);
        if (texto.startsWith("OK:")) {
            usuarioActual = texto.split(":")[1];
            iniciarSesionUI();
        } else {
            mensajeAuth.textContent = texto;
        }
    });

    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const datos = new URLSearchParams();
        datos.append("accion", "login");
        datos.append("identificador", document.getElementById("login-usuario").value.trim());
        datos.append("password", document.getElementById("login-password").value.trim());

        const texto = await enviarPeticionServidor(datos);
        if (texto.startsWith("OK:")) {
            usuarioActual = texto.split(":")[1];
            iniciarSesionUI();
        } else {
            mensajeAuth.textContent = texto;
        }
    });

    document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
        usuarioActual = null;
        nodos = [];
        nodoSeleccionadoId = null;
        renderizarTodo();
        pantallaAuth.style.display = "flex";
    });

    function iniciarSesionUI() {
        badgeUsuario.textContent = usuarioActual;
        pantallaAuth.style.display = "none";
        mensajeAuth.textContent = "";
        cargarListaDiagramas();
    }

    document.querySelectorAll(".simbolo-item").forEach(item => {
        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("tipoSimbolo", item.dataset.type);
        });
    });

    lienzo.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    lienzo.addEventListener("drop", (e) => {
        e.preventDefault();
        const tipo = e.dataTransfer.getData("tipoSimbolo");
        if (!tipo) return;

        const rect = lienzo.getBoundingClientRect();
        const x = Math.max(20, Math.round(e.clientX - rect.left + lienzo.scrollLeft - 75));
        const y = Math.max(20, Math.round(e.clientY - rect.top + lienzo.scrollTop - 25));

        crearNodo(tipo, x, y);
    });

    function crearNodo(tipo, x, y) {
        const nodo = {
            id: "nodo_" + (contadorId++),
            type: tipo,
            x: x,
            y: y,
            texto: obtenerTextoInicial(tipo),
            si1: "x = x + 1;",
            si2: "printf(\"SI 2\\n\");",
            no1: "x = x - 1;",
            no2: "printf(\"NO 2\\n\");",
            colorContorno: obtenerContornoInicial(tipo),
            colorRelleno: obtenerRellenoInicial(tipo),
            tamanoLetra: 13
        };

        nodos.push(nodo);
        seleccionarNodo(nodo.id);
        renderizarTodo();
    }

    function obtenerTextoInicial(tipo) {
        switch (tipo) {
            case "inicio": return "INICIO";
            case "fin": return "FIN";
            case "declaracion": return "int num;";
            case "entrada": return "num";
            case "salida": return "\"El número ingresado es: \", num";
            case "sentencia": return "num = 0;";
            case "if": return "num > 0";
            case "for": return "int i = 0; i < 3; i++";
            case "while": return "num < 5";
            case "dowhile": return "num != 0";
            default: return "";
        }
    }

    function obtenerContornoInicial(tipo) {
        if (tipo === "inicio" || tipo === "fin") return "#ec407a";
        if (tipo === "declaracion" || tipo === "salida") return "#c2185b";
        if (tipo === "sentencia") return "#d81b60";
        if (tipo === "entrada") return "#f06292";
        return "#ad1457";
    }

    function obtenerRellenoInicial(tipo) {
        if (tipo === "inicio" || tipo === "fin") return "#ffe4ec";
        if (tipo === "declaracion") return "#fce4ec";
        if (tipo === "sentencia") return "#ffd6e5";
        if (tipo === "entrada") return "#fff0f6";
        if (tipo === "salida") return "#ffe8f0";
        return "#fff5f8";
    }

    function pedirNoVacio(mensaje, valorActual) {
        let entrada = prompt(mensaje, valorActual);
        if (entrada === null) return valorActual;
        while (entrada.trim() === "") {
            entrada = prompt("Este campo es obligatorio (mínimo 2 instrucciones en SI y NO):\n" + mensaje, valorActual);
            if (entrada === null) return valorActual;
        }
        return entrada.trim();
    }

    function editarInstruccionesNodo(nodo) {
        if (nodo.type === "inicio" || nodo.type === "fin") return;

        nodo.texto = pedirNoVacio("Escribe la instrucción o condición:", nodo.texto);

        if (nodo.type === "if" || nodo.type === "for" || nodo.type === "while" || nodo.type === "dowhile") {
            nodo.si1 = pedirNoVacio("Caso SI - Instrucción 1 (mínimo 2):", nodo.si1);
            nodo.si2 = pedirNoVacio("Caso SI - Instrucción 2 (mínimo 2):", nodo.si2);
            nodo.no1 = pedirNoVacio("Caso NO - Instrucción 1 (mínimo 2):", nodo.no1);
            nodo.no2 = pedirNoVacio("Caso NO - Instrucción 2 (mínimo 2):", nodo.no2);
        }

        renderizarTodo();
    }

    function seleccionarNodo(id) {
        nodoSeleccionadoId = id;
        const nodo = nodos.find(n => n.id === id);
        if (nodo) {
            inputContorno.value = nodo.colorContorno;
            inputRelleno.value = nodo.colorRelleno;
            inputTamanoLetra.value = nodo.tamanoLetra;
        }
        actualizarClasesSeleccion();
    }

    function actualizarClasesSeleccion() {
        document.querySelectorAll(".node").forEach(el => {
            el.classList.toggle("selected", el.dataset.id === nodoSeleccionadoId);
        });
    }

    inputContorno.addEventListener("input", () => {
        const nodo = nodos.find(n => n.id === nodoSeleccionadoId);
        if (nodo) {
            nodo.colorContorno = inputContorno.value;
            renderizarTodo();
        }
    });

    inputRelleno.addEventListener("input", () => {
        const nodo = nodos.find(n => n.id === nodoSeleccionadoId);
        if (nodo) {
            nodo.colorRelleno = inputRelleno.value;
            renderizarTodo();
        }
    });

    inputTamanoLetra.addEventListener("input", () => {
        const nodo = nodos.find(n => n.id === nodoSeleccionadoId);
        if (nodo) {
            nodo.tamanoLetra = parseInt(inputTamanoLetra.value, 10) || 13;
            renderizarTodo();
        }
    });

    btnEliminar.addEventListener("click", () => {
        if (!nodoSeleccionadoId) return;
        nodos = nodos.filter(n => n.id !== nodoSeleccionadoId);
        nodoSeleccionadoId = null;
        renderizarTodo();
    });

    function renderizarTodo() {
        document.querySelectorAll(".node").forEach(el => el.remove());

        nodos.forEach(nodo => {
            const div = document.createElement("div");
            div.className = "node" + (nodo.id === nodoSeleccionadoId ? " selected" : "");
            div.dataset.id = nodo.id;
            div.dataset.type = nodo.type;
            div.style.left = nodo.x + "px";
            div.style.top = nodo.y + "px";
            div.style.borderColor = nodo.colorContorno;
            div.style.backgroundColor = nodo.colorRelleno;
            div.style.fontSize = nodo.tamanoLetra + "px";

            let html = `<div>${escaparHTML(nodo.texto)}</div>`;

            if (nodo.type === "if" || nodo.type === "for" || nodo.type === "while" || nodo.type === "dowhile") {
                html += `
                    <div class="sub-ramas">
                        <div class="rama-si">SI:</div>
                        <div>1) ${escaparHTML(nodo.si1)}</div>
                        <div>2) ${escaparHTML(nodo.si2)}</div>
                        <div class="rama-no" style="margin-top:4px;">NO:</div>
                        <div>1) ${escaparHTML(nodo.no1)}</div>
                        <div>2) ${escaparHTML(nodo.no2)}</div>
                    </div>
                `;
            }

            div.innerHTML = html;

            div.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                seleccionarNodo(nodo.id);
                iniciarArrastreNodo(e, nodo, div);
            });

            div.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                editarInstruccionesNodo(nodo);
            });

            lienzo.appendChild(div);
        });

        dibujarConexionesSVG();
        generarCodigoC();
    }

    function iniciarArrastreNodo(e, nodo, elemento) {
        const offsetX = e.clientX - nodo.x;
        const offsetY = e.clientY - nodo.y;

        function mover(ev) {
            nodo.x = Math.max(10, ev.clientX - offsetX);
            nodo.y = Math.max(10, ev.clientY - offsetY);
            elemento.style.left = nodo.x + "px";
            elemento.style.top = nodo.y + "px";
            dibujarConexionesSVG();
        }

        function soltar() {
            document.removeEventListener("mousemove", mover);
            document.removeEventListener("mouseup", soltar);
            generarCodigoC();
        }

        document.addEventListener("mousemove", mover);
        document.addEventListener("mouseup", soltar);
    }

    function dibujarConexionesSVG() {
        svgCanvas.querySelectorAll("line").forEach(l => l.remove());

        const ordenados = [...nodos].sort((a, b) => a.y - b.y);

        for (let i = 0; i < ordenados.length - 1; i++) {
            const actualEl = document.querySelector(`.node[data-id="${ordenados[i].id}"]`);
            const sigEl = document.querySelector(`.node[data-id="${ordenados[i + 1].id}"]`);
            if (!actualEl || !sigEl) continue;

            const x1 = ordenados[i].x + actualEl.offsetWidth / 2;
            const y1 = ordenados[i].y + actualEl.offsetHeight;
            const x2 = ordenados[i + 1].x + sigEl.offsetWidth / 2;
            const y2 = ordenados[i + 1].y;

            const linea = document.createElementNS("http://www.w3.org/2000/svg", "line");
            linea.setAttribute("x1", x1);
            linea.setAttribute("y1", y1);
            linea.setAttribute("x2", x2);
            linea.setAttribute("y2", y2);
            svgCanvas.appendChild(linea);
        }
    }

    function generarCodigoC() {
        const ordenados = [...nodos].sort((a, b) => a.y - b.y);
        let lineas = ["void main() {"];

        ordenados.forEach(n => {
            switch (n.type) {
                case "declaracion":
                    lineas.push(`    ${asegurarPuntoComa(n.texto)}`);
                    break;
                case "entrada":
                    lineas.push(`    scanf("%d", &${n.texto.replace(/;/g, "")});`);
                    break;
                case "salida":
                    if (n.texto.includes(",") || n.texto.startsWith("\"")) {
                        lineas.push(`    printf(${n.texto});`);
                    } else {
                        lineas.push(`    printf("${n.texto}");`);
                    }
                    break;
                case "sentencia":
                    lineas.push(`    ${asegurarPuntoComa(n.texto)}`);
                    break;
                case "if":
                    lineas.push(`    if (${n.texto}) {`);
                    lineas.push(`        ${asegurarPuntoComa(n.si1)}`);
                    lineas.push(`        ${asegurarPuntoComa(n.si2)}`);
                    lineas.push(`    } else {`);
                    lineas.push(`        ${asegurarPuntoComa(n.no1)}`);
                    lineas.push(`        ${asegurarPuntoComa(n.no2)}`);
                    lineas.push(`    }`);
                    break;
                case "for":
                    lineas.push(`    for (${n.texto}) {`);
                    lineas.push(`        ${asegurarPuntoComa(n.si1)}`);
                    lineas.push(`        ${asegurarPuntoComa(n.si2)}`);
                    lineas.push(`    }`);
                    lineas.push(`    ${asegurarPuntoComa(n.no1)}`);
                    lineas.push(`    ${asegurarPuntoComa(n.no2)}`);
                    break;
                case "while":
                    lineas.push(`    while (${n.texto}) {`);
                    lineas.push(`        ${asegurarPuntoComa(n.si1)}`);
                    lineas.push(`        ${asegurarPuntoComa(n.si2)}`);
                    lineas.push(`    }`);
                    lineas.push(`    ${asegurarPuntoComa(n.no1)}`);
                    lineas.push(`    ${asegurarPuntoComa(n.no2)}`);
                    break;
                case "dowhile":
                    lineas.push(`    do {`);
                    lineas.push(`        ${asegurarPuntoComa(n.si1)}`);
                    lineas.push(`        ${asegurarPuntoComa(n.si2)}`);
                    lineas.push(`    } while (${n.texto});`);
                    lineas.push(`    ${asegurarPuntoComa(n.no1)}`);
                    lineas.push(`    ${asegurarPuntoComa(n.no2)}`);
                    break;
            }
        });

        lineas.push("}");
        codigoCPre.textContent = lineas.join("\n");
    }

    function asegurarPuntoComa(inst) {
        const limpia = inst.trim();
        return limpia.endsWith(";") ? limpia : limpia + ";";
    }

    function construirXML() {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<diagrama usuario="${escaparXML(usuarioActual)}">\n`;
        nodos.forEach(n => {
            xml += `  <simbolo id="${escaparXML(n.id)}" tipo="${escaparXML(n.type)}" x="${n.x}" y="${n.y}" contorno="${escaparXML(n.colorContorno)}" relleno="${escaparXML(n.colorRelleno)}" fuente="${n.tamanoLetra}">\n`;
            xml += `    <texto>${escaparXML(n.texto)}</texto>\n`;
            xml += `    <si1>${escaparXML(n.si1)}</si1>\n`;
            xml += `    <si2>${escaparXML(n.si2)}</si2>\n`;
            xml += `    <no1>${escaparXML(n.no1)}</no1>\n`;
            xml += `    <no2>${escaparXML(n.no2)}</no2>\n`;
            xml += `  </simbolo>\n`;
        });
        xml += `</diagrama>`;
        return xml;
    }

    function cargarDesdeXML(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, "application/xml");
        const simbolosXML = doc.querySelectorAll("simbolo");

        nodos = [];
        let maxNum = 0;

        simbolosXML.forEach(el => {
            const idStr = el.getAttribute("id") || "nodo_1";
            const num = parseInt(idStr.replace("nodo_", ""), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;

            nodos.push({
                id: idStr,
                type: el.getAttribute("tipo"),
                x: parseInt(el.getAttribute("x"), 10),
                y: parseInt(el.getAttribute("y"), 10),
                colorContorno: el.getAttribute("contorno"),
                colorRelleno: el.getAttribute("relleno"),
                tamanoLetra: parseInt(el.getAttribute("fuente"), 10) || 13,
                texto: el.querySelector("texto")?.textContent || "",
                si1: el.querySelector("si1")?.textContent || "",
                si2: el.querySelector("si2")?.textContent || "",
                no1: el.querySelector("no1")?.textContent || "",
                no2: el.querySelector("no2")?.textContent || ""
            });
        });

        contadorId = maxNum + 1;
        nodoSeleccionadoId = null;
        renderizarTodo();
    }

    btnGuardar.addEventListener("click", async () => {
        const nombre = inputNombreDiagrama.value.trim();
        if (!nombre) {
            alert("Ingresa un nombre para guardar el diagrama.");
            return;
        }

        const xmlContenido = construirXML();
        const datos = new URLSearchParams();
        datos.append("accion", "guardar");
        datos.append("usuario", usuarioActual);
        datos.append("nombreDiagrama", nombre);
        datos.append("xml", xmlContenido);

        const texto = await enviarPeticionServidor(datos);
        alert(texto);
        cargarListaDiagramas();
    });

    async function cargarListaDiagramas() {
        if (!usuarioActual) return;
        const datos = new URLSearchParams();
        datos.append("accion", "listar");
        datos.append("usuario", usuarioActual);

        try {
            const listaTexto = await enviarPeticionServidor(datos);
            selectDiagramas.innerHTML = `<option value="">-- Selecciona un diagrama --</option>`;
            if (listaTexto.trim() !== "") {
                listaTexto.split(",").forEach(nombre => {
                    if (nombre.trim()) {
                        const opt = document.createElement("option");
                        opt.value = nombre.trim();
                        opt.textContent = nombre.trim();
                        selectDiagramas.appendChild(opt);
                    }
                });
            }
        } catch (err) {
            console.error(err);
        }
    }

    btnCargar.addEventListener("click", async () => {
        const nombre = selectDiagramas.value;
        if (!nombre) {
            alert("Selecciona un diagrama guardado.");
            return;
        }

        const datos = new URLSearchParams();
        datos.append("accion", "cargar");
        datos.append("usuario", usuarioActual);
        datos.append("nombreDiagrama", nombre);

        const xmlTexto = await enviarPeticionServidor(datos);
        if (xmlTexto.startsWith("<?xml")) {
            cargarDesdeXML(xmlTexto);
            inputNombreDiagrama.value = nombre;
        } else {
            alert(xmlTexto);
        }
    });

    function escaparHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function escaparXML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }
});