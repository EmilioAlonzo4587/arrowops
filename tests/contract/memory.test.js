const { createIncidentRepository } = require('../../backend/src/repositories/incidentRepository');
const { describeIncidentRepositoryContract } = require('./incidentRepository.contract');

describeIncidentRepositoryContract('memoria', () => createIncidentRepository());
