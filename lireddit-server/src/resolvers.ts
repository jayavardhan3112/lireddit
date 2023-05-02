import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
  @Query(() => Number)
  hello() {
    return 123123012;
  }
}
