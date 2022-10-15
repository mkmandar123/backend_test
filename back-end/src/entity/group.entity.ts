import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import { CreateGroupInput, UpdateGroupInput } from "../interface/group.interface"

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  number_of_weeks: number

  @Column()
  roll_states: string

  @Column()
  incidents: number

  @Column()
  ltmt: string

  @Column({
    nullable: true,
  })
  run_at: Date

  @Column()
  student_count: number

  public prepareToCreate(input: CreateGroupInput) {
    Object.keys(input).forEach((key: string) => {
      this[key] = input[key];
    });
    this.student_count = 0
  }

  public prepareToUpdate(input: UpdateGroupInput) {
    Object.keys(input).forEach((key: string) => {
      if (input[key]) {
        this[key] = input[key];
      }
    });
  }
}
