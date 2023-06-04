import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { spec, request } from 'pactum';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthDto } from 'src/auth/dto';

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
    describe('Create bookmark', () => {});
    describe('Get bookmarks', () => {});
    describe('Get bookmark by id', () => {});
    describe('Edit bookmark', () => {});
    describe('Delete bookmark', () => {});
  });
});
