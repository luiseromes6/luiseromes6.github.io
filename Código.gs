// ✅ Paso 1: Configuración inicial - Crear hojas si no existen
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = ['Productos', 'Compras', 'Ventas', 'Gastos', 'Resumen_Diario', 'Configuracion_Oculta'];

  hojas.forEach(nombre => {
    if (!ss.getSheetByName(nombre)) {
      ss.insertSheet(nombre);
    }
  });

  const hojaProductos = ss.getSheetByName('Productos');
  hojaProductos.clear();
  hojaProductos.appendRow(['ID_Producto', 'Nombre', 'Categoría', 'Precio_Venta', 'Stock_Actual', 'Stock_Mínimo', 'Activo', 'Costo_Promedio']);

  const hojaCompras = ss.getSheetByName('Compras');
  hojaCompras.clear();
  hojaCompras.appendRow(['ID_Compra', 'Fecha', 'Proveedor', 'ID_Producto', 'Cantidad', 'Precio_Compra_Unitario', 'Total_Compra', 'Tipo_Compra', 'Observaciones']);

  const hojaVentas = ss.getSheetByName('Ventas');
  hojaVentas.clear();
  hojaVentas.appendRow(['ID_Venta', 'Fecha', 'Hora', 'ID_Producto', 'Cantidad', 'Precio_Venta', 'Total_Venta', 'Costo_Promedio_Unitario', 'Costo_Total', 'Ganancia_Bruta', 'Forma_Pago']);

  const hojaGastos = ss.getSheetByName('Gastos');
  hojaGastos.clear();
  hojaGastos.appendRow(['ID_Gasto', 'Fecha', 'Tipo_Gasto', 'Descripción', 'Monto', 'Periodicidad']);

  const hojaResumen_Diario = ss.getSheetByName('Resumen_Diario');
  hojaResumen_Diario.clear();
  hojaResumen_Diario.appendRow(['Fecha', 'Total_Ventas', 'Costo_Vendido', 'Ganancia_Bruta', 'Gastos_Del_Día', 'Utilidad_Neta', 'Operaciones']);

  const hojaConfiguracion_Oculta = ss.getSheetByName('Configuracion_Oculta');
  hojaConfiguracion_Oculta.clear();
  hojaConfiguracion_Oculta.appendRow(['Clave', 'Valor', 'Descripción']);
}

// Ejecutar esta función manualmente la primera vez
 // ✅ doGet: muestra la interfaz al abrir el link
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("TiendaControl Pro")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("TiendaControl Pro")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}





function obtenerProductos() {
  const ss = SpreadsheetApp.getActive();
  const hoja = ss.getSheetByName('Productos');
  const datos = hoja.getDataRange().getValues();

  // Quitamos encabezados
  datos.shift();

  return datos.map(fila => ({
  id: fila[0],           // ID_Producto
  nombre: fila[1],       // Nombre
  categoria: fila[2],    // Categoría
  precio: fila[3],       // Precio_Venta
  stock: fila[4],        // Stock_Actual
  stockMinimo: fila[5],  // Stock_Mínimo
  costo: fila[7],        // Costo_Promedio
  activo: fila[6]        // Activo
})).filter(p => p.activo === true);

}

function registrarVenta(datosVenta) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaVentas = ss.getSheetByName('Ventas');
  const hojaProductos = ss.getSheetByName('Productos');

  const hoy = new Date();
  const idVenta = 'V' + hojaVentas.getLastRow();

  const productos = hojaProductos.getDataRange().getValues();

  let costoPromedio = 0;
  let filaProducto = -1;

  // 🔍 Buscar producto
  for (let i = 1; i < productos.length; i++) {
    if (productos[i][0] == datosVenta.idProducto) {
      costoPromedio = parseFloat(productos[i][7]) || 0;
      filaProducto = i;
      break;
    }
  }

  if (filaProducto === -1) {
    throw new Error('Producto no encontrado');
  }

  // 🔒 Bloquear venta sin costo definido
if (costoPromedio <= 0) {
  return {
    success: false,
    mensaje: '❌ Este producto no tiene costo definido. Se edita antes de vender.'
  };
}


  const cantidad = datosVenta.cantidad;
  const precioVenta = datosVenta.precio;

  // 🔒 Validar cantidad y precio
if (
  cantidad === '' || precioVenta === '' ||
  isNaN(cantidad) || isNaN(precioVenta) ||
  cantidad <= 0 || precioVenta <= 0
) {
  return {
    success: false,
    mensaje: '❌ Cantidad y precio deben ser mayores a cero'
  };
}


  // 🔒 Validar stock disponible
  const stockActual = productos[filaProducto][4];

  if (cantidad > stockActual) {
    return {
      success: false,
      mensaje: `❌ Stock insuficiente. Disponible: ${stockActual}`
    };
  }

  const totalVenta = cantidad * precioVenta;
  const costoTotal = cantidad * costoPromedio;
  const ganancia = totalVenta - costoTotal;

  // 🧾 Guardar venta
  hojaVentas.appendRow([
    idVenta,
    hoy,
    hoy.toTimeString().slice(0, 5),
    datosVenta.idProducto,
    cantidad,
    precioVenta,
    totalVenta,
    costoPromedio,
    costoTotal,
    ganancia,
    datosVenta.formaPago
  ]);

  // 📉 Actualizar stock
  const nuevoStock = stockActual - cantidad;
  hojaProductos.getRange(filaProducto + 1, 5).setValue(nuevoStock);

  return {
    success: true,
    mensaje: `✅ Venta ${idVenta} registrada. Ganancia: $${ganancia.toFixed(2)}`
  };
}



// Ahora viene Compras, para reponer el stock

function registrarCompra(datosCompra) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaCompras = ss.getSheetByName('Compras');
  const hojaProductos = ss.getSheetByName('Productos');
  
  const hoy = new Date();
  const idCompra = 'C' + (hojaCompras.getLastRow());

  // Guardar compra
  const fila = [
    idCompra,
    hoy,
    datosCompra.proveedor || 'Proveedor general',
    datosCompra.idProducto,
    datosCompra.cantidad,
    datosCompra.precio,
    datosCompra.cantidad * datosCompra.precio,
    datosCompra.tipoCompra,
    datosCompra.observaciones || ''
  ];
  
  hojaCompras.appendRow(fila);

  // Actualizar stock y costo promedio
  const productos = hojaProductos.getDataRange().getValues();

  for (let i = 1; i < productos.length; i++) {
    if (productos[i][0] == datosCompra.idProducto) {

      const stockActual = Number(productos[i][4]);
      const costoActual = Number(productos[i][7]) || 0;

      const cantidadCompra = Number(datosCompra.cantidad);
      const costoCompra = Number(datosCompra.precio);

      let nuevoCostoPromedio;

      if (stockActual === 0) {
        nuevoCostoPromedio = costoCompra;
      } else {
        nuevoCostoPromedio =
          ((stockActual * costoActual) + (cantidadCompra * costoCompra)) /
          (stockActual + cantidadCompra);
      }

      const nuevoStock = stockActual + cantidadCompra;

      // Actualizar en la hoja
      hojaProductos.getRange(i + 1, 5).setValue(nuevoStock);      // Stock_Actual
      hojaProductos.getRange(i + 1, 8).setValue(nuevoCostoPromedio); // Costo_Promedio

      break;
    }
  }

  return {
    success: true,
    mensaje: `✅ Compra ${idCompra} registrada. Stock +${datosCompra.cantidad}`
  };
}


// Ahora esto es Resumen diario

function cargarResumen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // 📊 VENTAS
  const hojaVentas = ss.getSheetByName('Ventas');
  const ventasData = hojaVentas.getDataRange().getValues();

  let totalVentas = 0;
  let costoVendido = 0;
  let gananciaBruta = 0;
  let operaciones = 0;

  for (let i = 1; i < ventasData.length; i++) {
    const fechaVenta = new Date(ventasData[i][1]);
    fechaVenta.setHours(0, 0, 0, 0);

    if (fechaVenta.getTime() === hoy.getTime()) {
      totalVentas += parseFloat(ventasData[i][6]) || 0;
      costoVendido += parseFloat(ventasData[i][8]) || 0;
      gananciaBruta += parseFloat(ventasData[i][9]) || 0;
      operaciones++;
    }
  }

  // 💸 GASTOS
  const hojaGastos = ss.getSheetByName('Gastos');
  const gastosData = hojaGastos.getDataRange().getValues();

  let gastosDia = 0;

  for (let i = 1; i < gastosData.length; i++) {
    const fechaGasto = new Date(gastosData[i][1]);
    fechaGasto.setHours(0, 0, 0, 0);

    if (fechaGasto.getTime() === hoy.getTime()) {
      gastosDia += parseFloat(gastosData[i][4]) || 0;
    }
  }

  const utilidadNeta = gananciaBruta - gastosDia;

  return {
    totalVentas: totalVentas.toFixed(2),
    costoVendido: costoVendido.toFixed(2),
    gananciaBruta: gananciaBruta.toFixed(2),
    gastosDia: gastosDia.toFixed(2),
    utilidadNeta: utilidadNeta.toFixed(2),
    operaciones: operaciones
  };
}

function guardarProducto(datos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Productos');
  const filas = hoja.getDataRange().getValues();

  const stock = parseInt(datos.stock || 0);
  const stockMin = parseInt(datos.stockMin || 0);
  const precio = parseFloat(datos.precio || 0);
  const costo = parseFloat(datos.costo || 0);

  // ✏️ EDITAR PRODUCTO EXISTENTE
  if (datos.id) {
    for (let i = 1; i < filas.length; i++) {
      if (filas[i][0] === datos.id) {
        hoja.getRange(i + 1, 2).setValue(datos.nombre);     // Nombre
        hoja.getRange(i + 1, 3).setValue(datos.categoria); // Categoría
        hoja.getRange(i + 1, 4).setValue(precio);          // Precio venta
        hoja.getRange(i + 1, 5).setValue(stock);           // Stock actual
        hoja.getRange(i + 1, 6).setValue(stockMin);        // Stock mínimo
        hoja.getRange(i + 1, 8).setValue(costo);           // Costo promedio

        return {
          success: true,
          mensaje: `✅ ${datos.nombre} actualizado correctamente`
        };
      }
    }
  }

  // ➕ CREAR NUEVO PRODUCTO
  const idNuevo = 'P' + hoja.getLastRow();

  hoja.appendRow([
    idNuevo,        // ID_Producto
    datos.nombre,   // Nombre
    datos.categoria,// Categoría
    precio,         // Precio_Venta
    stock,          // Stock_Actual
    stockMin,       // Stock_Mínimo
    true,           // Activo
    costo            // Costo_Promedio
  ]);

  return {
    success: true,
    mensaje: `✅ ${datos.nombre} agregado con costo $${costo}`
  };
}



function registrarGasto(datosGasto) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaGastos = ss.getSheetByName('Gastos');

  const hoy = new Date();
  const idGasto = 'G' + hojaGastos.getLastRow();

  hojaGastos.appendRow([
    idGasto,
    hoy,
    datosGasto.tipo,
    datosGasto.descripcion || '',
    parseFloat(datosGasto.monto),
    datosGasto.periodicidad || 'Único'
  ]);

  return {
    success: true,
    mensaje: `✅ Gasto registrado por $${parseFloat(datosGasto.monto).toFixed(2)}`
  };
}


