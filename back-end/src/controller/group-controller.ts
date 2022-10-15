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
    return this.groupStudentRepository.query('SELECT GroupStudent.student_id\n' +
      'FROM GroupStudent\n' +
      'INNER JOIN Student ON GroupStudent.student_id=Student.id;')
  }


  async runGroupFilters(request: Request, response: Response, next: NextFunction) {
    await this.groupStudentRepository.clear();
    const allGroups = await this.groupRepository.find();
    // const separatedGroupsByRollStates = [];
    // allGroups.forEach((group: Group) => {
    //   const rollStates = group.roll_states?.split(',');
    //   rollStates.forEach((state: string) => {
    //     separatedGroupsByRollStates.push({
    //       id: group.id,
    //       name: group.name,
    //       number_of_weeks: group.number_of_weeks,
    //       roll_states: state.trim(),
    //       incidents: group.incidents,
    //       ltmt: group.ltmt,
    //     });
    //   });
    // });
    // const groupStudentCountMapping: { groupId: string, studentCount: number } = {};
    const rollStatesPromises = [];
    allGroups.forEach((group: Group) => {
      rollStatesPromises.push(this.getStudentsEligibleForGroup(group.roll_states, group.incidents, group));
    })
    const rollStatesResolvedPromises = await Promise.all(rollStatesPromises);
    const groupStudentPromises = [];
    rollStatesResolvedPromises.forEach((mapping: { eligibleStudents: Array<StudentRollState>, groupId: number }) => {
      mapping.eligibleStudents.forEach((student: StudentRollState) => {
        const studentGroup = new GroupStudent();
        studentGroup.student_id = student.student_id;
        studentGroup.group_id = mapping.groupId;
        groupStudentPromises.push(this.groupStudentRepository.save(studentGroup));
      });
    });
    return Promise.all(groupStudentPromises);
    // Task 2:

    // 1. Clear out the groups (delete all the students from the groups)

    // 2. For each group, query the student rolls to see which students match the filter for the group

    // 3. Add the list of students that match the filter to the group
  }

  async getStudentsEligibleForGroup(state: string, incidentThreshold: number, group: Group) {
    const eligibleStudents = await this.studentRollStateRepository.query(`SELECT * FROM student_roll_state
    WHERE state LIKE "%${state}%"
    GROUP BY student_roll_state.student_id
    HAVING count(*) > ${incidentThreshold - 1}`);
    group.student_count = eligibleStudents.length;
    group.run_at = new Date();
    await this.groupRepository.save(group);
    return { eligibleStudents, groupId: group.id };
  }
}
