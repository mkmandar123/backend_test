import { NextFunction, Request, Response } from "express"
import { Group } from "../entity/group.entity"
import { CommonHelper } from "../helpers/common-helper"
import { getRepository } from "typeorm"

export class GroupController {
  private groupRepository = getRepository(Group)

  async allGroups(request: Request, response: Response, next: NextFunction) {
    return this.groupRepository.find();
  }

  async createGroup(request: Request, response: Response, next: NextFunction) {
    const { body: params } = request
    const requiredFields = ['name', 'number_of_weeks', 'roll_states', 'incidents', 'ltmt'];
    const missingFields = CommonHelper.getMissingFields(requiredFields, Object.keys(params));
    if (missingFields.length) {
      response.status(400);
      return `Required fields: ${ missingFields } missing.`;
    }

    const group = new Group();
    group.prepareToCreate(request.body);
    return this.groupRepository.save(group);
  }

  async updateGroup(request: Request, response: Response, next: NextFunction) {
    const { body: params } = request

    const requiredFields = ['id'];
    const missingFields = CommonHelper.getMissingFields(requiredFields, Object.keys(params));
    if (missingFields.length) {
      response.status(400);
      return `Required fields: ${ missingFields } missing.`;
    }

    const group = await this.groupRepository.findOne(params.id);
    if (!group) {
      response.status(400);
      return `Group with given ID not found.`;
    }
    group.prepareToUpdate(request.body);
    return this.groupRepository.save(group);
  }

  async removeGroup(request: Request, response: Response, next: NextFunction) {
    const { body: params } = request

    const requiredFields = ['id'];
    const missingFields = CommonHelper.getMissingFields(requiredFields, Object.keys(params));
    if (missingFields.length) {
      response.status(400);
      return `Required fields: ${ missingFields } missing.`;
    }

    const group = await this.groupRepository.findOne(params.id);
    if (!group) {
      response.status(400);
      return `Group with given ID not found.`;
    }
    return this.groupRepository.delete(group);
  }

  async getGroupStudents(request: Request, response: Response, next: NextFunction) {

    // Task 1:

    // Return the list of Students that are in a Group
  }


  async runGroupFilters(request: Request, response: Response, next: NextFunction) {
    // Task 2:

    // 1. Clear out the groups (delete all the students from the groups)

    // 2. For each group, query the student rolls to see which students match the filter for the group

    // 3. Add the list of students that match the filter to the group
  }
}
