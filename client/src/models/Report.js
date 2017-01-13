import Model from 'components/Model'

export default class Report extends Model {
	static resourceName = "Report"

	static schema = {
		intent: '',
		engagementDate: null,
		atmosphere: null,
		atmosphereDetails: '',
		location: {},
		attendees: [],
		poams: [],
		comments: [],
		reportText: '',
		nextStepsSummary: '',
		nextSteps: '',
		keyOutcomesSummary: '',
		keyOutcomes: ''
	}

	isDraft() {
		return this.state === 'DRAFT'
	}

	isPending() {
		return this.state === 'PENDING_APPROVAL'
	}

	toString() {
		return this.intent || "None"
	}

	validateForSubmit() {
		let errors = [];
		if (!this.engagementDate) {
			errors.push("You must provide the Date of Engagement");
		}
		if (!this.atmosphere) {
			errors.push("You must provide the overall atmosphere of the engagement")
		} else {
			if (this.atmosphere !== "POSITIVE" && !this.atmosphereDetails) {
				errors.push("You must provide atmosphere details if the engagement was not Positive");
			}
		}
		let primaryPrincipal = this.getPrimaryPrincipal();
		let primaryAdvisor = this.getPrimaryAdvisor();
		if (!primaryPrincipal) {
			errors.push("You must provide the primary Princpal for the Engagement")
		}
		if (!primaryAdvisor) {
			errors.push("You must provide the primary Advisor for the Engagement")
		}

		if (!this.nextStepsSummary) {
			errors.push("You must provide a brief summary of the Next Steps")
		}
		if (!this.keyOutcomesSummary) {
			errors.push("You must provide a brief summary of the Key Outcomes")
		}
		return errors;
	}

	getPrimaryPrincipal() {
		return this.attendees.find( el =>
			el.role === "PRINCIPAL" && el.primary
		);
	}

	getPrimaryAdvisor() {
		return this.attendees.find( el =>
			el.role === "ADVISOR" && el.primary
		);
	}

}
