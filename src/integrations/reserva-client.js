import { config } from '../config.js';
import { AppError } from '../errors.js';

export class ReservaClient {
  async validate(reservaId, authorization) {
    if (!config.reservaValidationEnabled) return true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.reservaRequestTimeoutMs);
    try {
      const response = await fetch(
        `${config.reservaServiceUrl}/reservas/${encodeURIComponent(reservaId)}`,
        {
          headers: authorization ? { authorization } : {},
          signal: controller.signal
        }
      );

      if (response.status === 404) {
        throw new AppError('Reserva de hospedagem não encontrada', 422, 'INVALID_RESERVATION');
      }
      if (!response.ok) {
        throw new AppError(
          'Não foi possível validar a reserva de hospedagem',
          502,
          'RESERVATION_SERVICE_ERROR'
        );
      }

      const reserva = await response.json();
      if (reserva.ativa === false || ['CANCELADA', 'CANCELADO'].includes(reserva.status)) {
        throw new AppError('A reserva de hospedagem não está ativa', 422, 'INVALID_RESERVATION');
      }
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name === 'AbortError') {
        throw new AppError('Tempo excedido ao validar a reserva', 504, 'RESERVATION_TIMEOUT');
      }
      throw new AppError(
        'Falha de comunicação com o microsserviço de reservas',
        502,
        'RESERVATION_SERVICE_ERROR'
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
