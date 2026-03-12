import { notFound, ok, serverError } from "@/lib/http";
import { getFacultyByPublicToken } from "@/services/faculty-service";

type Context = {
  params: Promise<{ publicToken: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { publicToken } = await context.params;
    const faculty = await getFacultyByPublicToken(publicToken);

    if (!faculty || !faculty.activeStatus) {
      return notFound("Faculty not found");
    }

    return ok({
      faculty: {
        id: faculty.id,
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        publicToken: faculty.publicToken
      }
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
