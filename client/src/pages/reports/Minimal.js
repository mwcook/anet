import React, {PropTypes} from 'react'
import Page from 'components/Page'
import {Alert, Table, Button, Modal, Checkbox} from 'react-bootstrap'
import autobind from 'autobind-decorator'
import moment from 'moment'
import utils from 'utils'

import {Report, Person, Poam} from 'models'
import Form from 'components/Form'
import Messages from 'components/Messages'

import API from 'api'

export default class ReportMinimal extends Page {
	static contextTypes = {
		app: PropTypes.object,
	}
	static pageProps = {
		useNavigation: false,
		minimalHeader: true
	}
	static modelName = 'Report'

	constructor(props) {
		super(props)
		this.state = {
			report: new Report({id: props.params.id}),
		}
	}

	fetchData(props) {
		API.query(/* GraphQL */`
			report(id:${props.params.id}) {
				id, intent, engagementDate, atmosphere, atmosphereDetails
				keyOutcomes, reportText, nextSteps, cancelledReason

				state

				location { id, name }
				author {
					id, name
					position {
						organization {
							shortName, longName
							approvalSteps {
								id, name,
								approvers {
									id, name,
									person { id, name rank }
								}
							}
						}
					}
				}

				attendees {
					id, name, role, primary
					position { id, name }
				}
				primaryAdvisor { id }
				primaryPrincipal { id }

				poams { id, shortName, longName, responsibleOrg { id, shortName} }

				comments {
					id, text, createdAt, updatedAt
					author { id, name, rank }
				}

				principalOrg { id, shortName, longName }
				advisorOrg { id, shortName, longName }

				approvalStatus {
					type, createdAt
					step { id , name
						approvers { id, name, person { id, name } }
					},
					person { id, name, rank}
				}

				approvalStep { name, approvers { id } }
			}
		`).then(data => {
			this.setState({report: new Report(data.report)})
		})
	}

	render() {
		let {report} = this.state

		let errors = report.isDraft() && report.validateForSubmit()
		let isCancelled = (report.cancelledReason) ? true : false

		return (
			<div>
				<Messages error={this.state.error} success={this.state.success} />

				{report.isRejected() &&
					<fieldset style={{textAlign: 'center' }}>
						<h4 className="text-danger">This report was REJECTED. </h4>
					</fieldset>
				}

				{report.isDraft() &&
					<fieldset style={{textAlign: 'center'}}>
						<h4 className="text-danger">This report is in DRAFT state and hasn't been submitted.</h4>
						<p>You can review the draft below to make sure all the details are correct.</p>
						<div style={{textAlign: 'left'}}>
							{errors && errors.length > 0 &&
								this.renderValidationErrors(errors)
							}
						</div>
					</fieldset>
				}

				{report.isPending() &&
					<fieldset style={{textAlign: 'center'}}>
						<h4 className="text-danger">This report is PENDING approvals.</h4>
						<p>It won't be available in the ANET database until your <a href="#approvals">approval organization</a> marks it as approved.</p>
					</fieldset>
				}

				<Form static formFor={report} horizontal>
					<h2 className="form-header">Report #{report.id}</h2>
					<fieldset className="show-report-overview">

						<Form.Field id="intent" label="Summary" >
							<p><strong>Meeting goal:</strong> {report.intent}</p>
							{report.keyOutcomes && <p><span><strong>Key outcomes:</strong> {report.keyOutcomes}&nbsp;</span></p>}
							<p><strong>Next steps:</strong> {report.nextSteps}</p>
						</Form.Field>

						<Form.Field id="engagementDate" label="Date" getter={date => date && moment(date).format('D MMMM, YYYY')} />

						<Form.Field id="location" label="Location">
							<span>{report.location.name}</span>
						</Form.Field>

						{!isCancelled &&
							<Form.Field id="atmosphere" label="Atmospherics">
								{utils.upperCaseFirst(report.atmosphere)}
								{report.atmosphereDetails && ` – ${report.atmosphereDetails}`}
							</Form.Field>
						}
						{isCancelled &&
							<Form.Field id="cancelledReason" label="Cancelled Reason">
								{utils.sentenceCase(report.cancelledReason)}
							</Form.Field>
						}
						<Form.Field id="author" label="Report author">
							<span>{report.author && report.author.name}</span>
						</Form.Field>
						<Form.Field id="advisorOrg" label="Advisor Org">
							<span>{report.advisorOrg && report.advisorOrg.shortName }</span>
						</Form.Field>
						<Form.Field id="principalOrg" label="Principal Org">
							<span>{report.principalOrg && report.principalOrg.shortName }</span>
						</Form.Field>
					</fieldset>

					<fieldset>
						<legend>Meeting attendees</legend>

						<Table condensed>
							<thead>
								<tr>
									<th style={{textAlign: 'center'}}>Primary</th>
									<th>Name</th>
									<th>Position</th>
								</tr>
							</thead>

							<tbody>
								{Person.map(report.attendees.filter(p => p.role === "ADVISOR"), person =>
									this.renderAttendeeRow(person)
								)}
								<tr className="attendeeTableRow" ><td colSpan={3}><hr className="attendeeDivider" /></td></tr>
								{Person.map(report.attendees.filter(p => p.role === "PRINCIPAL"), person =>
									this.renderAttendeeRow(person)
								)}
							</tbody>
						</Table>
					</fieldset>

					<fieldset>
						<legend>Plan of Action and Milestones / Pillars</legend>

						<Table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Organization</th>
								</tr>
							</thead>

							<tbody>
								{Poam.map(report.poams, (poam, idx) =>
									<tr key={poam.id} id={"poam_" + idx}>
										<td className="poamName" >{poam.shortName} - {poam.longName}</td>
										<td className="poamOrg" >{poam.responsibleOrg && poam.responsibleOrg.shortName }</td>
									</tr>
								)}
							</tbody>
						</Table>
					</fieldset>

					<fieldset>
						<legend>Meeting discussion</legend>
						<div dangerouslySetInnerHTML={{__html: report.reportText}} />
					</fieldset>

					{report.isPending() && this.renderApprovals() }

					<fieldset>
						<legend>Comments</legend>

						{report.comments.map(comment => {
							let createdAt = moment(comment.createAt)
							return (
								<p key={comment.id}>
									{comment.author.name}
									<span title={createdAt.format('L LT')}> {createdAt.fromNow()}: </span>
									"{comment.text}"
								</p>
							)
						})}

						{!report.comments.length && 'There are no comments yet.'}
					</fieldset>
				</Form>
			</div>
		)
	}

	@autobind
	renderApprovals(canApprove) {
		let report = this.state.report
		return <fieldset>
			<a name="approvals" />
			<legend>Approvals</legend>
			{report.approvalStatus.map(action =>
				this.renderApprovalAction(action)
			)}
		</fieldset>
	}

	@autobind
	renderAttendeeRow(person) {
		return <tr key={person.id} className="attendeeTableRow" >
			<td className="primary-attendee">
				{person.primary && <Checkbox readOnly checked />}
			</td>
			<td>
				<img src={person.iconUrl()} alt={person.role} height={20} width={20} className="person-icon" />
				{person.name}
			</td>
				<td>{person.position && person.position.name}</td>
		</tr>
	}

	@autobind
	onChange() {
		let report = this.state.report
		let email = this.state.email
		this.setState({report, email})
	}

	@autobind
	getApprovalComment(){
		return this.state.approvalComment.text
	}

	@autobind
	onChangeComment(value) {
		let approvalComment = this.state.approvalComment
		approvalComment.text = value.target.value
		this.setState({approvalComment})
	}

	@autobind
	updateReport(json) {
		this.fetchData(this.props)
		window.scrollTo(0, 0)
	}

	@autobind
	handleError(response) {
		this.setState({error: response})
		window.scrollTo(0, 0)
	}

	@autobind
	renderApprovalAction(action) {
		let step = action.step
		return <div key={step.id}>
			<Button onClick={this.showApproversModal.bind(this, step)}>
				{step.name}
			</Button>
			<Modal show={step.showModal} onHide={this.closeApproversModal.bind(this, step)}>
				<Modal.Header closeButton>
					<Modal.Title>Approvers for {step.name}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<ul>
					{step.approvers.map(p =>
						<li key={p.id}>{p.name} - {p.person && p.person.name}</li>
					)}
					</ul>
				</Modal.Body>
			</Modal>
	 	{action.type ?
				<span> {action.type} by {action.person.name} <small>{moment(action.createdAt).format('D MMM YYYY')}</small></span>
				:
				<span className="text-danger"> Pending</span>
			}
		</div>
	}

	renderValidationErrors(errors) {
		return <Alert bsStyle="danger">
			The following errors must be fixed before submitting this report
			<ul>
			{ errors.map((error,idx) =>
				<li key={idx}>{error}</li>
			)}
			</ul>
		</Alert>
	}

	@autobind
	showApproversModal(step) {
		step.showModal = true
		this.setState(this.state)
	}

	@autobind
	closeApproversModal(step) {
		step.showModal = false
		this.setState(this.state)
	}
}