'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The esn.calendar routes', function() {
  var $rootScope, $state, $q, $injector, calPathBuilder;
  var calEventServiceMock, calEventUtilsMock, notificationFactoryMock;
  var returnResults, stateParams;

  function goTo(state, params) {
    $state.go(state, params);
    $rootScope.$digest();
  }

  function invokeStateController(state, view, args) {
    var stateOrViewDefinition = view ? $state.get(state).views[view] : $state.get(state);
    var controller = stateOrViewDefinition.controller;

    return $injector.invoke(controller, null, args);
  }

  beforeEach(function() {
    returnResults = {
      event: {},
      editedEvent: {},
      error: {}
    };

    notificationFactoryMock = {
      weakInfo: sinon.spy(),
      weakError: sinon.spy()
    };

    calEventUtilsMock = {
      getEditedEvent: sinon.spy(function() {
        return returnResults.editedEvent;
      })
    };

    calEventServiceMock = {
      getEvent: sinon.spy(function() {
        return $q.when(returnResults.event);
      })
    };

    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('notificationFactory', notificationFactoryMock);
      $provide.value('calEventUtils', calEventUtilsMock);
      $provide.value('calEventService', calEventServiceMock);
    });
  });

  beforeEach(function() {
    angular.mock.inject(function(_$rootScope_, _$state_, _$q_, _$injector_, _calPathBuilder_) {
      $rootScope = _$rootScope_;
      $state = _$state_;
      $q = _$q_;
      calPathBuilder = _calPathBuilder_;
      $injector = _$injector_;
    });
  });

  describe('The calendar.event.form state', function() {
    var eventPath;

    beforeEach(function() {
      stateParams = {
        calendarHomeId: 'calendarHomeId',
        eventId: 'eventId'
      };

      eventPath = calPathBuilder.forEventId(stateParams.calendarHomeId, stateParams.eventId);
    });

    it('should not call calEventService.getEvent when calEventUtils.getEditedEvent returns a non empty object', function() {
      returnResults.editedEvent = {
        attr: 'attr'
      };

      goTo('calendar.event.form', stateParams);

      expect(calEventUtilsMock.getEditedEvent).to.have.been.calledWith();
      expect(calEventServiceMock.getEvent).to.not.have.been.called;
      expect(notificationFactoryMock.weakError).to.not.have.been.called;
    });

    it('should call calEventService.getEvent when calEventUtils.getEditedEvent returns an empty object', function() {
      goTo('calendar.event.form', stateParams);

      expect(calEventUtilsMock.getEditedEvent).to.have.been.calledWith();
      expect(calEventServiceMock.getEvent).to.have.been.calledWith(eventPath);
      expect(notificationFactoryMock.weakError).to.not.have.been.called;
    });

    it('should call calEventService.getEvent when calEventUtils.getEditedEvent returns undefined', function() {
      returnResults.editedEvent = undefined;

      goTo('calendar.event.form', stateParams);

      expect(calEventUtilsMock.getEditedEvent).to.have.been.calledWith();
      expect(calEventServiceMock.getEvent).to.have.been.calledWith(eventPath);
      expect(notificationFactoryMock.weakError).to.not.have.been.called;
    });

    it('should expose the resolved event to the scope', function() {
      var scope = {};
      var event = 'event';
      var calendarHomeId = 'calendarHomeId';

      invokeStateController('calendar.event.form', 'content', {
          $scope: scope,
          event: event,
          calendarHomeId: calendarHomeId
        }
      );

      expect(scope.event).to.equal(event);
      expect(scope.calendarHomeId).to.equal(calendarHomeId);
    });

    describe('When $stateParams.recurrenceId is defined', function() {
      it('should get the event from recurrentId query parameter', function() {
        var getExceptionByRecurrenceIdSpy = sinon.spy(function() {
          return 'TheRecurrentEvent';
        });

        stateParams.recurrenceId = '123';

        returnResults.event = {
          getExceptionByRecurrenceId: getExceptionByRecurrenceIdSpy
        };
        goTo('calendar.event.form', stateParams);

        expect(calEventUtilsMock.getEditedEvent).to.have.been.called;
        expect(calEventServiceMock.getEvent).to.have.been.calledWith(eventPath);
        expect(getExceptionByRecurrenceIdSpy).to.have.been.calledWith(stateParams.recurrenceId);
        expect(notificationFactoryMock.weakError).to.not.have.been.called;
      });

      it('should reject when recurrence is not found', function() {
        var getExceptionByRecurrenceIdSpy = sinon.spy();

        stateParams.recurrenceId = '123';
        $state.go = sinon.spy($state.go);

        returnResults.event = {
          getExceptionByRecurrenceId: getExceptionByRecurrenceIdSpy
        };
        goTo('calendar.event.form', stateParams);

        expect(calEventUtilsMock.getEditedEvent).to.have.been.called;
        expect(calEventServiceMock.getEvent).to.have.been.calledWith(eventPath);
        expect(getExceptionByRecurrenceIdSpy).to.have.been.calledWith(stateParams.recurrenceId);
        expect(notificationFactoryMock.weakError).to.have.been.calledWith('Can not display the event');
        expect($state.go.secondCall).to.have.been.calledWith('calendar.main');
      });
    });

    describe('the reject case of calEventUtils.getEditedEvent', function() {
      beforeEach(function() {
        calEventServiceMock.getEvent = sinon.spy(function() {
          return $q.reject(returnResults.error);
        });

        $state.go = sinon.spy($state.go);
      });

      it('should notify user when calEventUtils.getEditedEvent rejects and redirect to calendar.main', function() {
        returnResults.error = new Error();
        goTo('calendar.event.form', stateParams);

        expect(calEventUtilsMock.getEditedEvent).to.have.been.called;
        expect(calEventServiceMock.getEvent).to.have.been.calledWith(eventPath);
        expect(notificationFactoryMock.weakError).to.have.been.calledWith('Can not display the event');
        expect($state.go.secondCall).to.have.been.calledWith('calendar.main');
      });
    });
  });

  describe('The calendar.event.consult state', function() {
    it('should expose the resolved event to the scope', function() {
      var scope = {};
      var event = 'event';

      invokeStateController('calendar.event.consult', 'content', {
          $scope: scope,
          event: event
        }
      );

      expect(scope.event).to.equal(event);
    });
  });
});
