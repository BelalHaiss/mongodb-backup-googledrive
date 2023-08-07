import { createLogger, format, transports } from 'winston';
const { combine, timestamp } = format;

export const logger = createLogger({
  transports: [
    new transports.Console({ handleExceptions: true }),
    new transports.File({ level: 'info', filename: 'info.log' }),
    new transports.File({ level: 'error', filename: 'error.log' })
  ],
  format: combine(timestamp(), format.json()),
  level: 'info' // Set the default log level to 'info',
});
