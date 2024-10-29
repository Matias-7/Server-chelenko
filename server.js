const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const generarDisponibilidad = () => {
    const fechas = [];
    const fechaInicio = new Date("2024-10-10");
    const fechaFin = new Date("2024-10-15");
    
    for (let fecha = new Date(fechaInicio); fecha <= fechaFin; fecha.setDate(fecha.getDate() + 1)) {
        const disponible = Math.random() > 0.1;
        fechas.push({
            fecha: fecha.toISOString().split('T')[0],
            disponible: disponible
        });
    }

    return fechas;
};

const generarPropiedades = () => {
    const propiedades = [];
    
    for (let i = 1; i <= 10; i++) {
        propiedades.push({
            id: i.toString(),
            nombre: `Cabaña ${i}`,
            ubicacion: "Puerto Tranquilo",
            tipo: "Suite",
            precioPorNoche: 120 + (i * 10),
            disponibilidad: generarDisponibilidad(),
            calificacion: (4 + Math.random()).toFixed(1),
            estadoGeneral: "disponible"
        });
    }

    return propiedades;
};

const propiedades = generarPropiedades();

let reservas = [];

function getDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

app.get('/propiedades', (req, res) => {
    res.status(200).json(propiedades);
});

app.get('/propiedades/:id/disponibilidad', (req, res) => {
    const { id } = req.params;
    
    const propiedad = propiedades.find(p => p.id === id);

    if (!propiedad) {
        return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const disponibilidad = propiedad.disponibilidad;
    res.status(200).json(disponibilidad);
});

app.get('/buscar', (req, res) => {
    const { fechaInicio, fechaFin, tipo, ubicacion } = req.query;

    if (!fechaInicio || !fechaFin || !tipo || !ubicacion) {
        return res.status(400).json({ error: 'Faltan parámetros de búsqueda' });
    }

    const propiedadesDisponibles = propiedades.filter(propiedad => {
        const fechasReservadas = reservas.filter(reserva => 
            reserva.propiedadId === propiedad.id &&
            !(fechaFin < reserva.fechaInicio || fechaInicio > reserva.fechaFin)
        );

        const estaDisponible = fechasReservadas.length === 0; 
        const fechasDisponibles = propiedad.disponibilidad.filter(d => d.fecha >= fechaInicio && d.fecha <= fechaFin && d.disponible);      
        const cumpleTipo = propiedad.tipo === tipo;
        const cumpleUbicacion = propiedad.ubicacion.toLowerCase() === ubicacion.toLowerCase();

        return estaDisponible && fechasDisponibles.length === (new Date(fechaFin).getDate() - new Date(fechaInicio).getDate() + 1) && cumpleTipo && cumpleUbicacion;
    });

    res.status(200).json(propiedadesDisponibles);
});

app.post('/reservas', (req, res) => {
    const { usuarioId, propiedadId, fechaInicio, fechaFin } = req.body;

    if (!usuarioId || !propiedadId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'Faltan datos para la reserva' });
    }

    const propiedad = propiedades.find(p => p.id === propiedadId);
    if (!propiedad) {
        return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const fechasReservadas = reservas.filter(r => r.propiedadId === propiedadId && 
        (fechaInicio <= r.fechaFin && fechaFin >= r.fechaInicio));

    if (fechasReservadas.length > 0) {
        return res.status(400).json({ error: 'La propiedad no está disponible en las fechas seleccionadas' });
    }

    const nuevaReserva = { 
        id: (reservas.length + 1).toString(), 
        usuarioId, 
        propiedadId, 
        fechaInicio, 
        fechaFin, 
        estado: 'confirmada' 
    };

    reservas.push(nuevaReserva);

    const fechas = getDatesBetween(new Date(fechaInicio), new Date(fechaFin));
    fechas.forEach(fecha => {
        const disponibilidad = propiedad.disponibilidad.find(d => d.fecha === fecha);
        if (disponibilidad) {
            disponibilidad.disponible = false;
        }
    });

    res.status(201).json(nuevaReserva);
});

app.get('/reservas', (req, res) => {
    res.status(200).json(reservas);
});

app.get('/usuarios/:usuarioId/reservas', (req, res) => {
    const { usuarioId } = req.params;
    const reservasUsuario = reservas.filter(r => r.usuarioId === usuarioId);
    res.status(200).json(reservasUsuario);
});

app.delete('/reservas/:id', (req, res) => {
    const { id } = req.params;
    const reservaIndex = reservas.findIndex(r => r.id === id);

    if (reservaIndex === -1) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const reserva = reservas[reservaIndex];
    const propiedad = propiedades.find(p => p.id === reserva.propiedadId);
    const fechas = getDatesBetween(new Date(reserva.fechaInicio), new Date(reserva.fechaFin));
    fechas.forEach(fecha => {
        const disponibilidad = propiedad.disponibilidad.find(d => d.fecha === fecha);
        if (disponibilidad) {
            disponibilidad.disponible = true;
        }
    });

    reservas.splice(reservaIndex, 1);
    res.status(200).json({ message: 'Reserva cancelada correctamente' });
});

app.put('/propiedades/:id/disponibilidad', (req, res) => {
    const { id } = req.params;
    const { disponibilidad } = req.body;

    if (!disponibilidad || !Array.isArray(disponibilidad)) {
        return res.status(400).json({ error: 'Formato de disponibilidad inválido' });
    }

    const propiedad = propiedades.find(p => p.id === id);

    if (!propiedad) {
        return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    propiedad.disponibilidad = disponibilidad;

    res.status(200).json({ message: 'Disponibilidad actualizada', propiedad });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cron = require('node-cron');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL; // Your database API endpoint

app.use(bodyParser.json());

// Function to fetch hotel data from your API
async function getHotelData() {
  try {
    const response = await axios.get(`${API_BASE_URL}/hotel`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener los datos del hotel:', error);
    throw error;
  }
}

// Function to update room availability
async function updateRoomAvailability(roomId, dates, isAvailable) {
  try {
    const response = await axios.put(`${API_BASE_URL}/room/${roomId}/availability`, {
      dates,
      isAvailable
    });
    return response.data;
  } catch (error) {
    console.error('Error actualizando disponibilidad:', error);
    throw error;
  }
}

// Function to sync with OTA
async function syncWithOTA() {
  try {
    const hotelData = await getHotelData();
    
    // Prepare data for OTA
    const otaData = {
      hotelId: hotelData.id,
      rooms: hotelData.rooms.map(room => ({
        roomType: room.roomType,
        price: room.price,
        availability: room.availability
      }))
    };

    // Send data to OTA API
    const response = await axios.post('https://ota-api-endpoint.com/update', otaData, {
      headers: {
        'Authorization': `Bearer ${process.env.OTA_API_KEY}`
      }
    });

    console.log('Synced with OTA:', response.data);
  } catch (error) {
    console.error('Error al sincronizar la OTA:', error);
  }
}

// Schedule OTA sync
cron.schedule('0 * * * *', () => {
  console.log('Running OTA sync');
  syncWithOTA();
});

// Endpoints
app.get('/api/hotel-data', async (req, res) => {
  try {
    const hotelData = await getHotelData();
    res.json(hotelData);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los datos del hotel' });
  }
});

app.get('/propiedades/:id/disponibilidad', async (req, res) => {
  const { id } = req.params;
  try {
    const hotelData = await getHotelData();
    const room = hotelData.rooms.find(r => r.id === id);
    if (!room) {
      return res.status(404).json({ error: 'Habitación no encontrada' });
    }
    res.json(room.availability);
  } catch (error) {
    console.error('Error al obtener disponibilidad de la habitación:', error);
    res.status(500).json({ error: 'Error al obtener disponibilidad de la habitación' });
  }
});
app.get('/propiedades/:id/disponibilidad', async (req, res) => {
    const { id } = req.params;
    try {
      const hotelData = await getHotelData();
      const room = hotelData.rooms.find(r => r.id === id);
      if (!room) {
        return res.status(404).json({ error: 'Habitación no encontrada' });
      }
      res.json(room.availability);
    } catch (error) {
      console.error('Error al obtener disponibilidad de la habitación:', error);
      res.status(500).json({ error: 'Error al obtener disponibilidad de la habitación' });
    }
  });
  

app.get('/buscar', async (req, res) => {
  const { fechaInicio, fechaFin, tipo, ubicacion, maxPrecio, minCalificacion } = req.query;
  try {
    const hotelData = await getHotelData();
    const availableRooms = hotelData.rooms.filter(room => {
      const isAvailable = room.availability.every(date => 
        (date.date >= fechaInicio && date.date <= fechaFin) ? date.available : true
      );
      const meetsType = !tipo || room.roomType === tipo;
      const meetsPrice = !maxPrecio || room.price <= maxPrecio;
      // Assuming hotel has a rating property
      const meetsRating = !minCalificacion || hotelData.rating >= minCalificacion;

      return isAvailable && meetsType && meetsPrice && meetsRating;
    });

    res.status(200).json(availableRooms);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar propiedades' });
  }
});

app.post('/reservas', async (req, res) => {
  const { usuarioId, propiedadId, fechaInicio, fechaFin, roomType } = req.body;

  if (!usuarioId || !propiedadId || !fechaInicio || !fechaFin || !roomType) {
    return res.status(400).json({ error: 'Faltan datos de reserva requeridos' });
  }

  try {
    const hotelData = await getHotelData();
    const room = hotelData.rooms.find(r => r.roomType === roomType);
    
    if (!room) {
      return res.status(404).json({ error: 'Tipo de habitación no encontrada' });
    }

    // Update availability
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);
    const datesToUpdate = [];
    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
      datesToUpdate.push(d.toISOString().split('T')[0]);
    }

    await updateRoomAvailability(room.id, datesToUpdate, false);

    // Create reservation (you might want to add an endpoint for this in your API)
    const reservationData = { usuarioId, propiedadId, fechaInicio, fechaFin, roomType };
    const reservationResponse = await axios.post(`${API_BASE_URL}/reservations`, reservationData);

    // Trigger OTA sync
    await syncWithOTA();

    res.status(201).json({ message: 'Tu reserva ha sido creada!', reservation: reservationResponse.data });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

app.get('/reservas', async (req, res) => {
  try {
    const reservationsResponse = await axios.get(`${API_BASE_URL}/reservations`);
    res.status(200).json(reservationsResponse.data);
  } catch (error) {
    res.status(500).json({ error: 'Error error al recuperar las reservas' });
  }
});

app.get('/usuarios/:usuarioId/reservas', async (req, res) => {
  const { usuarioId } = req.params;
  try {
    const reservationsResponse = await axios.get(`${API_BASE_URL}/reservations?usuarioId=${usuarioId}`);
    res.status(200).json(reservationsResponse.data);
  } catch (error) {
    res.status(500).json({ error: 'Error al recuperar las reservas de los usuarios' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

/*
GET /propiedades: Obtiene la lista de propiedades.
GET /propiedades/
/disponibilidad: Verifica la disponibilidad de una propiedad.
POST /reservas: Crea una nueva reserva.
GET /reservas: Obtiene todas las reservas.
GET /usuarios/
/reservas: Obtiene las reservas de un usuario específico.
*/
