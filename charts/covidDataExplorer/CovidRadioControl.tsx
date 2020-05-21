import React from "react"
import { observer } from "mobx-react"
import { action } from "mobx"
import classNames from "classnames"

export interface RadioOption {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}

@observer
export class CovidRadioControl extends React.Component<{
    name: string
    isCheckbox?: boolean
    options: RadioOption[]
    comment?: string
}> {
    @action.bound onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        this.props.options[parseInt(ev.currentTarget.value)].onChange(
            ev.currentTarget.checked
        )
    }

    render() {
        const { name, comment } = this.props
        return (
            <div
                className={classNames(
                    "CovidDataExplorerControl",
                    this.props.name
                )}
            >
                <div className="ControlHeader">{this.props.name}</div>
                {this.props.options.map((option, index) => (
                    <div key={index}>
                        <label
                            className={
                                option.checked ? "SelectedOption" : "Option"
                            }
                            data-track-note={`covid-click-${name}`}
                        >
                            <input
                                onChange={this.onChange}
                                type={
                                    this.props.isCheckbox ? "checkbox" : "radio"
                                }
                                name={name}
                                checked={option.checked}
                                value={index}
                            />{" "}
                            {option.label}
                            {comment && (
                                <div className="comment">{comment}</div>
                            )}
                        </label>
                    </div>
                ))}
            </div>
        )
    }
}

export interface DropdownOption {
    name: string
    value: string
}

@observer
export class CovidDropdownControl extends React.Component<{
    name: string
    options: DropdownOption[]
    onChange: (value: string) => void
}> {
    @action.bound onChange(ev: React.ChangeEvent<HTMLSelectElement>) {
        this.props.onChange(ev.currentTarget.value)
    }

    render() {
        const { name } = this.props
        return (
            <div className={"CovidDataExplorerControl"}>
                <div className="ControlHeader">{this.props.name}</div>
                <select onChange={this.onChange}>
                    {this.props.options.map((option, index) => (
                        <option key={index} value={option.value}>
                            {option.name}
                        </option>
                    ))}
                </select>
            </div>
        )
    }
}
