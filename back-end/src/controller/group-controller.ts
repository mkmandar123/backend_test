import { NextFunction, Request, Response } from "express"
import { Group } from "../entity/group.entity"
import { GroupStudent } from "../entity/group-student.entity"
import { StudentRollState } from "../entity/student-roll-state.entity"
import { CommonHelper } from "../helpers/common-helper"
import { getRepository } from "typeorm"

export class GroupController {
  private groupRepository = getRepository(Group)
  private groupStudentRepository = getRepository(GroupStudent)
  private studentRollStateRepository = getRepository(StudentRollState)

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
    return this.groupStudentRepository.query('SELECT group_student.*, Student.first_name, Student.last_name, Student.first_name || " " || Student.last_name AS full_name\n' +
      'FROM group_student\n' +
      'INNER JOIN Student ON group_student.student_id=Student.id\n'+
      `WHERE group_student.group_id=${group.id}`)
  }


  async runGroupFilters(request: Request, response: Response, next: NextFunction) {
    await this.groupStudentRepository.clear();
    const allGroups = await this.groupRepository.find();
    const rollStatesPromises = allGroups.map((group: Group) => this.getStudentsEligibleForGroup(group));
    const rollStatesResolvedPromises = await Promise.all(rollStatesPromises);
    const groupStudentPromises = [];
    rollStatesResolvedPromises.forEach((mapping: { eligibleStudents: Array<StudentRollState>, groupId: number }) => {
      mapping.eligibleStudents.forEach((student: StudentRollState) => {
        const studentGroup = new GroupStudent();
        studentGroup.student_id = student.student_id;
        studentGroup.group_id = mapping.groupId;
        studentGroup.incident_count = mapping.eligibleStudents.length;
        groupStudentPromises.push(this.groupStudentRepository.save(studentGroup));
      });
    });
    return Promise.all(groupStudentPromises);
  }

  async getStudentsEligibleForGroup(group: Group) {
    const states = `(${"'" + group.roll_states.split(',').join("','") + "'"})`
    const eligibleStudents = await this.studentRollStateRepository.query(`SELECT * FROM student_roll_state
    WHERE state IN ${states}
    GROUP BY student_roll_state.student_id
    HAVING count(*) ${group.ltmt} ${group.incidents}`);
    group.student_count = eligibleStudents.length;
    group.run_at = new Date();
    await this.groupRepository.save(group);
    return { eligibleStudents, groupId: group.id };
  }
}
