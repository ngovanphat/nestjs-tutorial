import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { spec, request } from 'pactum';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from 'src/auth/dto';
import { CreateBookmarkDto, EditBookmarkDto } from 'src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    request.setDefaultTimeout(5000);
    request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@mail.com',
      password: '123',
    };
    describe('Sign Up', () => {
      it('Should fail because of email is empty', () => {
        return spec()
          .post('/auth/signup')
          .withBody({
            email: '',
            password: '123',
          })
          .expectStatus(400)
          .expectJson({
            error: 'Bad Request',
            message: ['email should not be empty', 'email must be an email'],
            statusCode: 400,
          });
      });

      it('Should fail because of password is empty', () => {
        return spec()
          .post('/auth/signup')
          .withBody({
            email: 'test@mail.com',
            password: '',
          })
          .expectStatus(400)
          .expectJson({
            error: 'Bad Request',
            message: ['password should not be empty'],
            statusCode: 400,
          });
      });

      it('Should fail because of empty body', () => {
        return spec().post('/auth/signup').expectStatus(400);
      });

      it('Should signup', () => {
        return spec().post('/auth/signup').withBody(dto).expectStatus(201);
      });
    });
    describe('Verify Email', () => {
      it('Should failed because of empty token', () => {
        return spec().get(`/auth/verify-email?token`).expectStatus(403);
      });

      it('Should failed because of token is wrong', () => {
        return spec().get(`/auth/verify-email?token=123456`).expectStatus(403);
      });

      it('Should verify email', async () => {
        const { emailVerificationToken } = await prisma.user.findUnique({
          where: {
            email: dto.email,
          },
          select: {
            emailVerificationToken: true,
          },
        });
        await spec()
          .get(`/auth/verify-email?token=${emailVerificationToken}`)
          .expectStatus(200);
      });
    });
    describe('Sign In', () => {
      it('Should fail because of email is empty', () => {
        return spec()
          .post('/auth/login')
          .withBody({
            email: '',
            password: '123',
          })
          .expectStatus(400)
          .expectJson({
            error: 'Bad Request',
            message: ['email should not be empty', 'email must be an email'],
            statusCode: 400,
          });
      });

      it('Should fail because of password is empty', () => {
        return spec()
          .post('/auth/login')
          .withBody({
            email: 'test@mail.com',
            password: '',
          })
          .expectStatus(400)
          .expectJson({
            error: 'Bad Request',
            message: ['password should not be empty'],
            statusCode: 400,
          });
      });

      it('Should fail because of empty body', () => {
        return spec().post('/auth/login').expectStatus(400);
      });

      it('Should login', () => {
        return spec()
          .post('/auth/login')
          .withBody(dto)
          .expectStatus(200)
          .stores('userAT', 'accessToken');
      });
    });
  });
  describe('User', () => {
    describe('Get me', () => {
      it('Should get current user', () => {
        return spec()
          .get('/users/me')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200);
      });
    });
    describe('Edit user', () => {
      it('Should update user ', () => {
        return spec()
          .patch('/users')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .withBody({
            firstName: 'firstName',
            lastName: 'lastName',
          })
          .expectStatus(200)
          .expectJsonLike({
            firstName: 'firstName',
            lastName: 'lastName',
          });
      });
    });
  });
  describe('Bookmarks', () => {
    describe('Get empty bookmarks', () => {
      it('Should return empty bookmarks', () => {
        return spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('Create bookmark', () => {
      it('Should create bookmark', () => {
        const dto: CreateBookmarkDto = {
          title: 'test book',
          description: 'this is a test book',
          link: 'https://example.com',
        };
        return spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });
    describe('Get bookmarks', () => {
      it('Should return bookmarks', () => {
        return spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });
    describe('Get bookmark by id', () => {
      it('Should get bookmark by id', () => {
        return spec()
          .get('/bookmarks/$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200);
      });
    });
    describe('Edit bookmark', () => {
      it('Should fail because bookmark not exist', () => {
        return spec()
          .put('/bookmarks/9999')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .withBody({
            title: 'Test 123',
          })
          .expectStatus(403);
      });

      it('Should update bookmark', () => {
        const editBookmarkDto: EditBookmarkDto = {
          title: 'test 123',
          description: 'description test 123',
        };
        return spec()
          .put('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .withBody(editBookmarkDto)
          .expectStatus(200)
          .expectJsonLike(editBookmarkDto);
      });
    });
    describe('Delete bookmark', () => {
      it('Should fail because bookmark not exist', () => {
        return spec()
          .delete('/bookmarks/9999')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(403);
      });

      it('Should delete bookmark', async () => {
        await spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(200);

        await spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAT}',
          })
          .expectStatus(404);
      });
    });
  });
});
